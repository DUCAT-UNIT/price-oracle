import * as Gecko from './gecko.js'

export namespace PriceFetcher {
  export const gecko = {
    PRICE_IVAL  : Gecko.PRICE_IVAL,
    WINDOW_SIZE : Gecko.WINDOW_SIZE,
    latest      : Gecko.fetch_latest_price,
    history     : Gecko.fetch_price_history
  }
}
