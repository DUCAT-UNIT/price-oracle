import { Database } from 'bun:sqlite'

import type { PricePoint } from '../types/index.js'

export class PriceDB {
  private readonly _db: Database

  constructor(db_path : string) {
    // Create the database connection.
    this._db = new Database(db_path, { create: true })
    // Create the price history table.
    console.log(`[ db ] creating price history table`)
    this._db.run(`
      CREATE TABLE IF NOT EXISTS price_history (
        stamp INTEGER PRIMARY KEY,
        price INTEGER NOT NULL
      )
    `)
    // Create the price history index.
    console.log(`[ db ] creating price history index`)
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
    console.log(`[ db ] inserting price : ${price} at stamp : ${stamp}`)
    this._db.run(`INSERT OR REPLACE INTO price_history (price, stamp) VALUES (?, ?)`, [ price, stamp ])
  }

  /**
   * Fetch the latest price and timestamp from the price history table.
   * @returns The latest price and timestamp.
   */
  get_latest_price(): PricePoint | null {
    console.log(`[ db ] getting latest price`)
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
    console.log(`[ db ] getting point at stamp : ${query_stamp}`)
    const row = this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      WHERE stamp = ?
    `).get(query_stamp) as PricePoint | null
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
    end_stamp   : number
  ) : PricePoint | null {
    // Get the price point at the earliest crossing.
    console.log(`[ db ] getting point below thold : ${price_thold} between ${start_stamp} and ${end_stamp}`)
    return this._db.query(`
      SELECT price, stamp
      FROM price_history 
      WHERE stamp BETWEEN ? AND ? 
      AND price < ?
      ORDER BY stamp ASC
      LIMIT 1
    `).get(start_stamp, end_stamp, price_thold) as PricePoint | null
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
    // Get the price history for the given time range.
    console.log(`[ db ] getting price history between ${start_stamp} and ${end_stamp}`)
    return this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      WHERE stamp BETWEEN ? AND ?
      ORDER BY stamp
    `).all(start_stamp, end_stamp) as PricePoint[]
  }

  /**
   * Close the database connection.
   */
  close(): void {
    console.log(`[ db ] closing database connection`)
    this._db.close()
  }
}
