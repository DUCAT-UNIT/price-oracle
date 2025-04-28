import { OVERRIDES, PRICE_IVAL } from '../const.js'
import { get_nearest_ival, now } from '../lib/util.js'

import type { PriceOracle } from '../class/price.js'

import type {
  PricePoint,
  StopPriceData,
  StopPriceQuery
} from '../types/index.js'

export function get_latest_price_api (client: PriceOracle) {
  return async (now_stamp : number = now()) : Promise<PricePoint | null> => {
    console.log(`[ api ] getting latest price`)
    try {
      // Get the latest price point.
      const latest_point = client.db.get_latest_price()
      // If the latest price point is found and the timestamp is within the price interval,
      if (latest_point && latest_point.stamp >= now_stamp - PRICE_IVAL) {
        // Return the latest price point.
        return latest_point
      }
      // Create a promise for fetching the latest price
      const prom = client.fetcher.latest()
      // Enqueue the promise with high priority
      const res = await client.queue.add(prom, 'high')
      // Check if the response is an error
      if (!res.ok) {
        console.error('Error response from API:', res.error)
        return null
      }
      // Format the price point.
      const point = synchronize_price_point(res.data)
      // Insert the price into the database
      client.db.insert_price(point.price, point.stamp)
      // Return the latest price point.
      return point
    } catch (error) {
      console.error('Error fetching latest price:', error)
      return null
    }
  }
}

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
      const res = await client.queue.add(prom, 'high')
      // Check if the response is an error
      if (!res.ok) {
        console.error('Error response from API:', res.error)
        return []
      }
      // Get the nearest ival for each price point.
      const points : PricePoint[] = res.data.map(synchronize_price_point)
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

export function get_price_at_stamp_api (client: PriceOracle) {
  return async (stamp: number) : Promise<PricePoint | null> => {
    console.log(`[ api ] getting price at stamp ${stamp}`)
    try {
      // Get the nearest ival for the requested timestamp.
      const query_stamp    = get_nearest_ival(stamp)
      // Check if there's an override for the requested timestamp.
      const override_point = fetch_price_override(query_stamp)
      // If there's an override, return it.
      if (override_point) return override_point
      // Check if there's a price point at the specified timestamp.
      const stamp_point    = client.db.get_point_at_stamp(query_stamp)
      // If the price point is found, return it.
      if (stamp_point) return stamp_point
      // Fetch the price history for the specified timestamp.
      // TODO: We need to better manage this window size.
      const points = await client.api.get_price_history(query_stamp - PRICE_IVAL, query_stamp + PRICE_IVAL)
      // If the price points are not found, return null.
      if (points.length === 0) return null
      // Find the closest price point to the requested timestamp.
      return points.find(pt => pt.stamp === query_stamp)
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
    console.log(`[ api ] getting stop price for query: ${JSON.stringify(query)}`)
    // Define the latest timestamp.
    const now_stamp = now()
    // Define the query parameters.
    const { curr_stamp = now_stamp, start_stamp = now_stamp, thold_price } = query
    // Define the query price point.
    let query_point : PricePoint | null = null
    // If the start stamp is the latest timestamp,
    if (start_stamp >= now_stamp) {
      // Get the latest price.
      query_point = await client.api.get_latest_price()
    // Otherwise, get the price at the start timestamp.
    } else {
      query_point = await client.api.get_price_at_stamp(start_stamp)
    }
    // If the query price point is not found, throw an error.
    if (!query_point) throw new Error(`price point not found for start stamp: ${start_stamp}`)
    // Define the current price point.
    let curr_point : PricePoint | null = null
    // If the current stamp is the same as the start stamp,
    if (curr_stamp === start_stamp) {
      // Use the starting price point.
      curr_point = query_point
    // If the current stamp is the latest timestamp,
    } else if (curr_stamp === now_stamp) {
      // Get the latest price.
      curr_point = await client.api.get_latest_price()
    // Otherwise, get the price at the specified timestamp.
    } else {
      curr_point = await client.api.get_price_at_stamp(curr_stamp)
    }
    // If the current price point is not found, throw an error.
    if (!curr_point) throw new Error(`price point not found for current stamp: ${curr_stamp}`)
    // Define the stop price point.
    let stop_point : PricePoint | null = null
    // If the threshold price is greater than or equal to the query price,
    if (thold_price >= query_point.price) {
      // Use the query price point.
      stop_point = query_point
    // If the threshold price is greater than or equal to the current price,
    } else if (thold_price >= curr_point.price) {
      // Use the current price point.
      stop_point = curr_point
    // Otherwise, get the price point below the threshold price.
    } else {
      stop_point = fetch_stop_price_point(client, thold_price, start_stamp, curr_stamp)
    }
    // Return the stop price data.
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

function synchronize_price_point (point: PricePoint) {
  return { ...point, stamp: get_nearest_ival(point.stamp) }
}

function fetch_stop_price_point (
  client      : PriceOracle,
  thold_price : number,
  start_stamp : number,
  end_stamp   : number
) : PricePoint | null {
  const override = fetch_stop_price_override(thold_price, start_stamp, end_stamp)
  if (override !== null) return override
  return client.db.get_point_below_thold(thold_price, start_stamp, end_stamp)
}

function fetch_price_override (
  price_stamp : number,
) : PricePoint | null {
  const override = OVERRIDES.find(e => e.stamp === price_stamp)
  if (override !== undefined) {
    console.log(`[ api ] returning price override for stamp : ${price_stamp}`)
  }
  return override ?? null
}

function fetch_stop_price_override (
  thold_price : number,
  start_stamp : number,
  end_stamp   : number
) : PricePoint | null {
  const filtered = OVERRIDES.filter(e => e.stamp >= start_stamp && e.stamp <= end_stamp)
  const override = filtered.find(e => e.price <= thold_price) ?? null
  if (override !== null) {
    console.log(`[ api ] returning stop price override for thold : ${thold_price}`)
  }
  return override
}
