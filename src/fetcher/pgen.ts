import * as CONST  from '../const.js'

import { ApiResponse, Resolve } from '../lib/fetch.js'
import { PriceGenerator }       from '../lib/generate.js'
import { now }                  from '../lib/util.js'

import type { PricePoint } from '../types/index.js'

// Price interval and window size for the price provider.
export const IVAL_SIZE   = 60 * 5       // 5 minutes
export const WINDOW_SIZE = 60 * 60 * 24 // 1 day

// Initialize the price generator.
const price_gen = new PriceGenerator(CONST.GENERATOR)

export async function fetch_latest_price() : Promise<ApiResponse<PricePoint>> {
  const current = now()
  const data = price_gen.simulate({
    curr_stamp  : current,
    start_stamp : current,
    thold_price : 0
  })
  return Resolve.data<PricePoint>({ price: data.close_price, stamp: data.close_stamp })
}

export async function fetch_price_history (
  start_stamp : number,
  stop_stamp? : number
) : Promise<ApiResponse<PricePoint[]>> {
  const current = now()
  const data = price_gen.simulate({
    curr_stamp  : current,
    start_stamp : current,
    thold_price : 0
  })
  return Resolve.data<PricePoint[]>([
    { price: data.close_price, stamp: data.close_stamp },
  ])
}
