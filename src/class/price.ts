import { PriceDB }      from './db.js'
import { RequestQueue } from './queue.js'
import { PriceScanner } from './scan.js'
import { PRICE_IVAL }   from '../const.js'

import {
  get_latest_price_api,
  get_price_at_stamp_api,
  get_price_history_api,
  get_stop_price_api
} from '../api/price.js'

import type {
  PriceFetcherAPI,
  PricePoint
} from '../types/index.js'

export class PriceOracle {
  private readonly _db      : PriceDB
  private readonly _fetcher : PriceFetcherAPI
  private readonly _queue   : RequestQueue
  private readonly _scanner : PriceScanner

  private _poll_timer : Timer | null = null

  constructor(
    db_path  : string,
    fetcher  : PriceFetcherAPI,
  ) {
    this._db      = new PriceDB(db_path)
    this._fetcher = fetcher
    this._queue   = new RequestQueue()
    this._scanner = new PriceScanner(this)
  }

  get api() {
    return {
      get_latest_price   : get_latest_price_api(this),
      get_price_history  : get_price_history_api(this),
      get_price_at_stamp : get_price_at_stamp_api(this),
      get_stop_price     : get_stop_price_api(this)
    }
  }

  get db(): PriceDB {
    return this._db
  }

  get fetcher(): PriceFetcherAPI {
    return this._fetcher
  }

  get queue(): RequestQueue {
    return this._queue
  }

  start_polling(): void {
    if (this._poll_timer) {
      console.warn('price polling already running')
      return
    } else {
      // Start price polling
      this.api.get_latest_price()
      this._poll_timer = setInterval(() => {
        this.api.get_latest_price()
      }, PRICE_IVAL * 1000)
    }

    if (this._scanner.is_running) {
      console.warn('price scanner already running')
      return
    } else {
      // Start price scanner.
      this._scanner.start()
    }

    // Start the queue processor.
    this._queue.start()
  }

  // Stop polling
  stop_polling(): void {
    // Stop price polling.
    if (this._poll_timer) {
      clearInterval(this._poll_timer)
      this._poll_timer = null
    }

    // Stop price scanner.
    if (this._scanner.is_running) {
      this._scanner.stop()
    }
        
    // Stop the queue processor
    this._queue.stop()
  }
}
