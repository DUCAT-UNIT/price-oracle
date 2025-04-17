export type PriceQuote = ActiveQuote | ExpiredQuote

export type QuotePreimage = [
  domain_label : string,
  oracle_pk    : string,
  curr_price   : number,
  curr_stamp   : number,
  quote_price  : number,
  quote_stamp  : number,
  stop_price   : number | null,
  stop_stamp   : number | null,
  thold_hash   : string,
  thold_key    : string | null,
  thold_price  : number,
]

export interface QuoteData {
  curr_price  : number
  curr_stamp  : number
  quote_price : number
  quote_stamp : number
  stop_price  : number | null
  stop_stamp  : number | null
}

export interface QuoteTemplate extends QuoteData {
  is_expired  : boolean
  oracle_pk   : string
  thold_hash  : string
  thold_key   : string | null
  thold_price : number
}

interface BaseQuote {
  curr_price  : number
  curr_stamp  : number
  quote_price : number
  quote_stamp : number
  oracle_pk   : string
  req_id      : string
  req_sig     : string
  thold_hash  : string
  thold_price : number
}

export interface ActiveQuote extends BaseQuote {
  is_expired : false
  stop_price : null
  stop_stamp : null
  thold_key  : null
}

export interface ExpiredQuote extends BaseQuote {
  is_expired : true
  stop_price : number
  stop_stamp : number
  thold_key  : string
}
