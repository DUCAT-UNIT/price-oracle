import * as Gecko from './gecko.js'

export namespace PriceFetcher {
  export const gecko = {
    latest  : Gecko.fetch_latest_price,
    history : Gecko.fetch_price_history
  }
}
