import { Database }   from 'bun:sqlite'
import { PRICE_IVAL } from '../const.js'

import {
  now,
  get_nearest_ival
} from '../lib/util.js'

import type { PricePoint } from '../types/index.js'

export class PriceDB {
  private readonly _db: Database

  constructor(db_path : string) {
    // Create the database connection.
    this._db = new Database(db_path, { create: true })
    // Create the price history table.
    this._db.run(`
      CREATE TABLE IF NOT EXISTS price_history (
        stamp INTEGER PRIMARY KEY,
        price INTEGER NOT NULL
      )
    `)
    // Create the price history index.
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_price ON price_history(price)`)
  }

  /**
   * Insert a price-timestamp tuple into the price history table.
   * @param price - The price to insert.
   * @param stamp - The timestamp to insert.
   */
  insert_price (
    price: number,
    stamp: number
  ): void {
    const ts = get_nearest_ival(stamp, PRICE_IVAL)
    this._db.run(`INSERT OR REPLACE INTO price_history (price, stamp) VALUES (?, ?)`, [ price, ts ])
  }

  /**
   * Fetch the latest price and timestamp from the price history table.
   * @returns The latest price and timestamp.
   */
  get_latest_price(): PricePoint | null {
    const row = this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      ORDER BY stamp DESC 
      LIMIT 1
    `).get() as PricePoint | null
    return row
  }

  /**
   * Fetch a historic price by timestamp from the price history table.
   * @param query_stamp - The timestamp to fetch the price at.
   * @returns The price and timestamp at the given timestamp.
   */
  get_point_at_stamp(query_stamp: number): PricePoint | null {
    const stamp = get_nearest_ival(query_stamp)
    const row   = this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      WHERE stamp = ?
    `).get(stamp) as PricePoint | null
    return row
  }

  /**
   * Check if the price crossed below a threshold price within a time range.
   * @param price_thold - The threshold price.
   * @param start_stamp - The start timestamp.
   * @param end_stamp   - The end timestamp.
   * @returns The price point at the earliest crossing.
   */
  get_point_below_thold (
    price_thold : number,
    start_stamp : number,
    end_stamp   : number = now()
  ) : PricePoint | null {
    // Get the nearest interval timestamps for the start and end timestamps.
    const start = get_nearest_ival(start_stamp)
    const end   = get_nearest_ival(end_stamp)
    // Get the price point at the earliest crossing.
    return this._db.query(`
      SELECT price, stamp
      FROM price_history 
      WHERE stamp BETWEEN ? AND ? 
      AND price < ?
      ORDER BY stamp ASC
      LIMIT 1
    `).get(start, end, price_thold) as PricePoint | null
  }

  /**
   * Fetch the price history for a given time range.
   * @param start_stamp - The start timestamp.
   * @param end_stamp   - The end timestamp.
   * @returns The price history for the given time range.
   */
  get_price_history (
    start_stamp : number,
    end_stamp   : number
  ): PricePoint[] {
    // Get the nearest interval timestamps for the start and end timestamps.
    const start = get_nearest_ival(start_stamp)
    const end   = get_nearest_ival(end_stamp)
    // Get the price history for the given time range.
    return this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      WHERE stamp BETWEEN ? AND ?
      ORDER BY stamp
    `).all(start, end) as PricePoint[]
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this._db.close()
  }
}
