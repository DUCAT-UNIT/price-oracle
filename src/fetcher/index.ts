import * as Gecko from './gecko.js'
import * as Pgen  from './pgen.js'

export namespace PriceFetcher {
  export const gecko = {
    IVAL_SIZE   : Gecko.IVAL_SIZE,
    WINDOW_SIZE : Gecko.WINDOW_SIZE,
    latest      : Gecko.fetch_latest_price,
    history     : Gecko.fetch_price_history
  }
  export const pgen = {
    IVAL_SIZE   : Pgen.IVAL_SIZE,
    WINDOW_SIZE : Pgen.WINDOW_SIZE,
    latest      : Pgen.fetch_latest_price,
    history     : Pgen.fetch_price_history
  }
}
