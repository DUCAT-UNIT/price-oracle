import { URLSearchParams } from 'url'
import { Fetch, Resolve }  from '../lib/fetch.js'
import { now }             from '../lib/util.js'

import {
  GENESIS_STAMP,
  ORACLE_API_HOST,
  ORACLE_API_KEY
} from '../const.js'

import type { PricePoint }  from '../types/index.js'
import type { ApiResponse } from '../lib/fetch.js'

export interface GeckoLatestPriceResponse {
  bitcoin: {
    usd             : number
    last_updated_at : number
  }
}

export interface GeckoHistoricPriceResponse {
  prices        : [ stamp: number, price: number ][]
  market_caps   : [ stamp: number, cap: number ][]
  total_volumes : [ stamp: number, vol: number ][]
}

const HEADERS = {
  accept             : 'application/json',
  'x-cg-pro-api-key' : ORACLE_API_KEY,
}

// Price interval and window size for the price provider.
export const IVAL_SIZE   = 3600          // 1 hour
export const WINDOW_SIZE = 24 * 60 * 60  // 1 day

/**
 * Fetch the latest price from the Gecko API.
 * @returns The latest price.
 */
export async function fetch_latest_price(): Promise<ApiResponse<PricePoint>> {
  // Get the host URL and create the endpoint.
  const host_url = ORACLE_API_HOST
  const params   = new URLSearchParams()
  // Set the parameters.
  params.set('ids', 'bitcoin')
  params.set('vs_currencies', 'usd')
  params.set('include_last_updated_at', 'true')
  // Create the URL and options.
  const url = `${host_url}/simple/price?${params.toString()}`
  const opt = { method : 'GET', headers : HEADERS }
  // Fetch the latest price.
  console.log(`[ fetcher ] fetching latest price from ${url}`)
  const res = await Fetch.json<GeckoLatestPriceResponse>(url, opt)
  // If the response is not ok, return the error.
  if (!res.ok) return res
  // Unpack the latest price.
  const { data: { bitcoin: { usd, last_updated_at } } } = res
  // Convert the price point to the proper format.
  const price = usd
  const stamp = last_updated_at
  console.log(`[ fetcher ] latest price: ${price} at ${stamp}`)
  // Return the latest price point.
  return Resolve.data<PricePoint>({ price, stamp })
}

/**
 * Fetch the price history from the Gecko API.
 * @param start_stamp - The start timestamp.
 * @param stop_stamp  - The end timestamp.
 * @returns The price history.
 */
export async function fetch_price_history (
  start_stamp : number,
  stop_stamp? : number
): Promise<ApiResponse<PricePoint[]>> {
  // Get the host URL and create the URL search params.
  const current  = now()
  const host_url = ORACLE_API_HOST
  const params   = new URLSearchParams()
  // Get the nearest ival for the start and stop timestamps.
  const start_ts = get_min_start_stamp(start_stamp)
  const stop_ts  = get_max_stop_stamp(stop_stamp)
  // Set the parameters.
  params.set('vs_currency', 'usd')
  params.set('from', start_ts.toString())
  params.set('to',   stop_ts.toString())
  // params.set('interval',         'daily')
  params.set('precision',   '0')
  // Create the URL and options.
  const url = `${host_url}/coins/bitcoin/market_chart/range?${params.toString()}`
  const opt = { method : 'GET', headers : HEADERS }
  // Fetch the price history.
  console.log(`[ fetcher ] fetching price history from ${url}`)
  const res = await Fetch.json<GeckoHistoricPriceResponse>(url, opt)
  // If the response is not ok, return the error.
  if (!res.ok) return res
  // Unpack the price history.
  const { data: { prices } } = res
  // Convert the price history to the proper format.
  const points = prices
    .map(([ stamp, price ]) => [ Math.floor(stamp / 1000), price ])
    .map(([ stamp, price ]) => ({ price, stamp }))
  // Return the price history.
  console.log(`[ fetcher ] price history: ${points.length} points`)
  return Resolve.data<PricePoint[]>(points)
}

function get_min_start_stamp (start_stamp : number): number {
  const start_ts = start_stamp - WINDOW_SIZE
  return Math.max(start_ts, GENESIS_STAMP)
}

function get_max_stop_stamp (stop_stamp? : number) : number {
  const current = now()
  const stop_ts = (stop_stamp ?? current) + IVAL_SIZE
  return Math.min(stop_ts, current)
}
