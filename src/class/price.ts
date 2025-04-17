import { PriceDB } from './db.js'
import { now }     from '../lib/util.js'

import {
  PRICE_IVAL,
  GENESIS_STAMP
} from '../const.js'

import type {
  PriceFetcherAPI,
  PricePoint
} from '../types/index.js'

export class PriceOracle {
  private _db      : PriceDB
  private _fetcher : PriceFetcherAPI
  private timers   : Map<string, Timer> = new Map()

  constructor(
    db_path  : string,
    fetcher  : PriceFetcherAPI,
  ) {
    this._db      = new PriceDB(db_path)
    this._fetcher = fetcher
  }

  get db(): PriceDB {
    return this._db
  }

  get fetcher(): PriceFetcherAPI {
    return this._fetcher
  }

  async fetch_latest_price(): Promise<PricePoint | null> {
    try {
      const res = await this._fetcher.latest()

      if (!res.ok) throw new Error(res.error)

      const { price, stamp } = res.data

      this.db.insert_price(price, stamp)

      return { price, stamp }
    } catch (error) {
      console.error("error fetching latest price:", error)
      return null
    }
  }

  start_price_polling(): void {
    const price_timer = this.timers.get('price')
    if (price_timer) {
      console.warn("Price polling already started")
      return
    }

    const gap_timer = this.timers.get('gap')
    if (gap_timer) {
      console.warn("Gap filling already started")
      return
    }

    // Start price polling
    this.fetch_latest_price()
    this.timers.set('price', setInterval(() => {
      this.fetch_latest_price()
    }, PRICE_IVAL * 1000))

    // Start gap filling routine
    this.fill_price_gaps(GENESIS_STAMP)
    this.timers.set('gap', setInterval(() => {
      this.fill_price_gaps(GENESIS_STAMP)
    }, 24 * 60 * 60 * 1000)) // Run once per day
  }

  // Stop polling
  stop_price_polling(): void {
    const price_timer = this.timers.get('price')
    if (price_timer) {
      clearInterval(price_timer)
      this.timers.delete('price')
    }

    const gap_timer = this.timers.get('gap')
    if (gap_timer) {
      clearInterval(gap_timer)
      this.timers.delete('gap')
    }
  }

  async fetch_price_history (
    start_stamp : number,
    stop_stamp? : number
  ): Promise<PricePoint[] | null> {
    try {
      const res = await this._fetcher.history(start_stamp, stop_stamp)

      if (!res.ok) throw new Error(res.error)
      
      for (const { price, stamp } of res.data) {
        this.db.insert_price(price, stamp)
      }

      return res.data
    } catch (error) {
      console.error(`Error fetching historical price between ${start_stamp} and ${stop_stamp}:`, error)
      return null
    }
  }

  /**
   * Fetches and fills gaps in historical price data in 24-hour increments.
   * @param start_stamp The starting timestamp to begin the search
   * @param end_stamp The ending timestamp to stop the search (defaults to now)
   */
  async fill_price_gaps(start_stamp: number, end_stamp: number = now()): Promise<void> {
    const DAY_IN_SECONDS = 24 * 60 * 60
    const expected_interval = PRICE_IVAL // 5 minutes in seconds

    // Process data in 24-hour chunks
    for (let chunk_start = start_stamp; chunk_start < end_stamp; chunk_start += DAY_IN_SECONDS) {
      const chunk_end = Math.min(chunk_start + DAY_IN_SECONDS, end_stamp)
      
      // Get existing price points in this time range
      const existing_points = this.db.get_price_history(chunk_start, chunk_end)
      
      // Find gaps in the data
      const gaps: number[] = []
      let expected_time = chunk_start
      
      for (const point of existing_points) {
        // If there's a gap larger than the expected interval
        if (point.stamp - expected_time > expected_interval * 2) {
          // Add timestamps for the missing data points
          for (let gap_time = expected_time; gap_time < point.stamp; gap_time += expected_interval) {
            gaps.push(gap_time)
          }
        }
        expected_time = point.stamp + expected_interval
      }
      
      // Check for gap at the end of the chunk
      if (expected_time < chunk_end) {
        for (let gap_time = expected_time; gap_time < chunk_end; gap_time += expected_interval) {
          gaps.push(gap_time)
        }
      }

      // If we found gaps, fetch the missing data
      if (gaps.length > 0) {
        console.log(`Found ${gaps.length} gaps in price data between ${new Date(chunk_start).toISOString()} and ${new Date(chunk_end).toISOString()}`)
        
        // Fetch historical data for the oldest gap
        const oldest_gap = gaps[0]
        const historical_data = await this.fetch_price_history(oldest_gap)
        
        if (historical_data) {
          // Filter out data points we already have
          const new_points = historical_data.filter(point => {
            const existing = existing_points.find(p => p.stamp === point.stamp)
            return !existing
          })
          
          // Insert the new data points
          for (const point of new_points) {
            this.db.insert_price(point.price, point.stamp)
          }
          
          console.log(`Inserted ${new_points.length} new price points`)
        }
      }
    }
  }
}
