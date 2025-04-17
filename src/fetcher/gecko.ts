import { get_nearest_ival, now } from '../lib/util.js'
import { Fetch, Resolve }   from '../util/fetch.js'

import {
  ORACLE_API_HOST,
  ORACLE_API_KEY
} from '../const.js'

import type { PricePoint }  from '../types/index.js'
import type { ApiResponse } from '../util/fetch.js'
import { URLSearchParams } from 'url'

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

export async function fetch_latest_price(): Promise<ApiResponse<PricePoint>> {
  const host_url = ORACLE_API_HOST
  const endpoint = 'simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true'

  const url = `${host_url}/${endpoint}`
  const opt = { method : 'GET', headers : HEADERS }

  const res = await Fetch.json<GeckoLatestPriceResponse>(url, opt)

  if (!res.ok) return res

  const { data: { bitcoin: { usd, last_updated_at } } } = res
  
  const price = usd
  const stamp = get_nearest_ival(last_updated_at)

  return Resolve.data<PricePoint>({ price, stamp })
}

export async function fetch_price_history(
  start_stamp : number,
  stop_stamp  : number = now()
): Promise<ApiResponse<PricePoint[]>> {
  // Convert timestamps to seconds
  const host_url = ORACLE_API_HOST
  const params   = new URLSearchParams()

  params.set('vs_currency',      'usd')
  params.set('from',             start_stamp.toString())
  params.set('to',               stop_stamp.toString())
  params.set('interval',         'daily')
  params.set('precision',        '0')

  console.log(params.toString())

  const endpoint = `coins/bitcoin/market_chart/range?${params.toString()}`

  const url = `${host_url}/${endpoint}`
  const opt = { method : 'GET', headers : HEADERS }

  const res = await Fetch.json<GeckoHistoricPriceResponse>(url, opt)

  if (!res.ok) return res

  const { data: { prices } } = res

  const points = prices
    .map(([ stamp, price ]) => [ Math.floor(stamp / 1000), price ])
    .map(([ stamp, price ]) => ({ price, stamp: get_nearest_ival(stamp) }))

  return Resolve.data<PricePoint[]>(points)
}
