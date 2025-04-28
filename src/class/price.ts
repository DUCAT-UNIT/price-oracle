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
    this._scanner = new PriceScanner(this, fetcher.IVAL_SIZE, fetcher.WINDOW_SIZE)
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

  /**
   * Start the price oracle.
   */
  start(): void {
    // If the price polling is not running,
    if (!this._poll_timer) {
      // Start price polling.
      this.api.get_latest_price()
      this._poll_timer = setInterval(() => {
        this.api.get_latest_price()
      }, PRICE_IVAL * 1000)
    }

    // Start the queue processor.
    this._queue.start()

    // Start the price scanner.
    this._scanner.scan()
  }

  /**
   * Stop the price oracle.
   */
  stop(): void {
    // Stop price polling.
    if (this._poll_timer) {
      clearInterval(this._poll_timer)
      this._poll_timer = null
    }

    // Stop the queue processor
    this._queue.stop()
  }
}
