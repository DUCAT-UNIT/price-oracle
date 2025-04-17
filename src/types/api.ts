import type { ApiResponse } from '../util/fetch.js'

export interface PricePoint {
  price : number  // Current price
  stamp : number  // Timestamp of this price
}

export interface PriceFetcherAPI {
  latest  : () => Promise<ApiResponse<PricePoint>>
  history :(
    start_stamp: number,
    stop_stamp?: number
  ) => Promise<ApiResponse<PricePoint[]>>
}

export interface PriceQuery {
  close_stamp? : number
  start_stamp  : number
  thold_price  : number
}

// Simulation result
export interface PriceData {
  close_price : number        // Current price
  close_stamp : number        // Timestamp of current price
  start_price : number        // Price at requested timestamp
  start_stamp : number        // Timestamp of requested price
  stop_price  : number | null // Price at threshold, or null if not hit
  stop_stamp  : number | null // Timestamp of threshold, or null if not hit
}
