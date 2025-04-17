import { PRICE_IVAL } from '../const.js'

import {
  get_nearest_ival,
  now
} from '../lib/util.js'

import type { PriceOracle } from '../class/price.js'

import type {
  PricePoint,
  StopPriceData,
  StopPriceQuery
} from '../types/index.js'

export function get_price_history_api (client: PriceOracle) {
  return async (
    start_stamp : number,
    end_stamp   : number
  ) : Promise<PricePoint[]> => {
      console.log(`[   api   ] getting price history from ${start_stamp} to ${end_stamp}`)
    try {
      // Get the nearest ival for the start and end timestamps
      const start_ts = get_nearest_ival(start_stamp)
      const end_ts   = get_nearest_ival(end_stamp)
      // Create a promise for fetching the price history
      const prom = client.fetcher.history(start_ts, end_ts)
      // Enqueue the promise with high priority
      const res = await client.queue.enqueue(prom, 'high')
      // Check if the response is an error
      if (!res.ok) {
        console.error('Error response from API:', res.error)
        return []
      }
      // Get the nearest ival for each price point.
      const points : PricePoint[] = res.data.map(pt => ({ ...pt, stamp: get_nearest_ival(pt.stamp) }))
      // Insert the price into the database
      for (const point of points) {
        // Insert the price into the database
        client.db.insert_price(point.price, point.stamp)
      }
      // Return the price history
      return points
    } catch (error) {
      console.error('Error fetching price history:', error)
      return []
    }
  }
}

export function get_latest_price_api (client: PriceOracle) {
  return async () : Promise<PricePoint | null> => {
    console.log(`[   api   ] getting latest price`)
    try {
      const now_stamp    = now()
      const latest_point = client.db.get_latest_price()

      if (latest_point && latest_point.stamp >= now_stamp - PRICE_IVAL) {
        return latest_point
      }

      // Create a promise for fetching the latest price
      const prom = client.fetcher.latest()
      
      // Enqueue the promise with high priority
      const res = await client.queue.enqueue(prom, 'high')
      
      // Check if the response is an error
      if (!res.ok) {
        console.error('Error response from API:', res.error)
        return null
      }

      // Insert the price into the database
      client.db.insert_price(res.data.price, res.data.stamp)
      
      return res.data
    } catch (error) {
      console.error('Error fetching latest price:', error)
      return null
    }
  }
}

export function get_price_at_stamp_api (client: PriceOracle) {
  return async (stamp: number) : Promise<PricePoint | null> => {
    console.log(`[   api   ] getting price at stamp ${stamp}`)
    try {
      const stamp_point = client.db.get_point_at_stamp(stamp)
      if (stamp_point) return stamp_point
      // Create a promise for fetching the price at a specific timestamp.
      const window = PRICE_IVAL
      const points = await client.api.get_price_history(stamp - window, stamp + window)
      // Find the price point closest to the requested timestamp
      if (points.length === 0) return null
      // Find the closest price point to the requested timestamp.
      return points.find(pt => pt.stamp === stamp)
        ?? points.at(0)
        ?? null
    } catch (error) {
      console.error('Error fetching price at stamp:', error)
      return null
    }
  }
}

export function get_stop_price_api (client: PriceOracle) {
  return async (query: StopPriceQuery) : Promise<StopPriceData> => {
    console.log(`[   api   ] getting stop price for query: ${JSON.stringify(query)}`)
    const { close_stamp = now(), start_stamp, thold_price } = query
    // Get the price at the close stamp.
    const now_stamp = now()

    let query_point : PricePoint | null = null
    
    if (start_stamp === now_stamp) {
      query_point = await client.api.get_latest_price()
    } else {
      query_point = await client.api.get_price_at_stamp(start_stamp)
    }

    if (!query_point) throw new Error(`price point not found for start stamp: ${start_stamp}`)

    let curr_point : PricePoint | null = null

    if (close_stamp === start_stamp) {
      curr_point = query_point
    } else if (close_stamp === now_stamp) {
      curr_point = await client.api.get_latest_price()
    } else {
      curr_point = await client.api.get_price_at_stamp(close_stamp)
    }

    if (!curr_point) throw new Error(`price point not found for close stamp: ${close_stamp}`)

    let stop_point : PricePoint | null = null

    if (thold_price >= query_point.price) {
      stop_point = query_point
    } else if (thold_price >= curr_point.price) {
      stop_point = curr_point
    } else {
      stop_point = client.db.get_point_below_thold(thold_price, start_stamp, close_stamp)
    }

    return {
      close_price : curr_point.price,
      close_stamp : curr_point.stamp,
      start_price : query_point.price,
      start_stamp : query_point.stamp,
      stop_price  : stop_point?.price ?? null,
      stop_stamp  : stop_point?.stamp ?? null
    }
  }
}
