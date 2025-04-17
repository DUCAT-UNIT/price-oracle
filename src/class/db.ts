import { Database } from 'bun:sqlite'

import {
  now,
  get_nearest_ival
} from '../lib/util.js'

import {
  PRICE_IVAL,
} from '../const.js'

interface PriceInterval {
  price : number
  stamp : number
}

export class PriceDB {
  private readonly _db: Database

  constructor(db_path : string) {
    this._db = new Database(db_path, { create: true })

    // Create table
    this._db.run(`
      CREATE TABLE IF NOT EXISTS price_history (
        stamp INTEGER PRIMARY KEY,
        price INTEGER NOT NULL
      )
    `)

    // Create indexes
    this._db.run(`CREATE INDEX IF NOT EXISTS idx_price ON price_history(price)`)
  }

  // Insert a price-timestamp tuple
  insert_price (
    price: number,
    stamp: number
  ): void {
    const ts = get_nearest_ival(stamp, PRICE_IVAL)
    this._db.run(`INSERT OR REPLACE INTO price_history (price, stamp) VALUES (?, ?)`, [price, ts])
  }

  // Fetch the latest price and timestamp
  get_latest_price(): PriceInterval | null {
    const row = this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      ORDER BY stamp DESC 
      LIMIT 1
    `).get() as PriceInterval | null
    return row
  }

  // Fetch a historic price by timestamp
  get_price_at_stamp(query_stamp: number): PriceInterval | null {
    const stamp = get_nearest_ival(query_stamp, PRICE_IVAL)
    const row   = this._db.query(`
      SELECT price, stamp 
      FROM price_history 
      WHERE stamp = ?
    `).get(stamp) as PriceInterval | null
    return row
  }

  // Check if price crossed below a threshold in a time range
  has_price_crossed_below (
    price_thold : number,
    start_stamp : number,
    end_stamp   : number = now()
  ): boolean {
    const start = get_nearest_ival(start_stamp, PRICE_IVAL)
    const end   = get_nearest_ival(end_stamp, PRICE_IVAL)
    const row   = this._db.query(`
      SELECT 1
      FROM price_history 
      WHERE stamp BETWEEN ? AND ? 
      AND price < ?
      LIMIT 1
    `).get(start, end, price_thold)
    return !!row
  }

  get_price_history (
    start_stamp : number, 
    end_stamp   : number
  ): PriceInterval[] {
    const start = get_nearest_ival(start_stamp, PRICE_IVAL)
    const end   = get_nearest_ival(end_stamp, PRICE_IVAL)
    // This is a simplified approach; actual gap detection depends on expected frequency
    const rows = this._db.query(`
      SELECT stamp 
      FROM price_history 
      WHERE stamp BETWEEN ? AND ?
      ORDER BY stamp
    `).all(start, end) as PriceInterval[]
    return rows
  }

  // Close the database
  close(): void {
    this._db.close()
  }
}
