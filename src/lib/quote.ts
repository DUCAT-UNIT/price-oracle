import { Buff } from '@cmdcode/buffy'

import type {
  PriceData,
  PriceQuery,
  QuoteData,
  QuotePreimage,
  QuoteTemplate
} from '../types/index.js'

import * as CONST  from '../const.js'
import * as Crypto from './crypto.js'
import * as Util   from './util.js'

const DOMAIN      = CONST.DOMAIN
const HMAC_SECRET = CONST.HMAC_SECRET

/**
 * Fetches a price quote from the generator.
 * 
 * @param price_gen    The price generator to use.
 * @param thold_price  The threshold price for the quote.
 * @param req_stamp    The timestamp of the request.
 * @param curr_stamp   The current timestamp.
 * @returns            Returns a price quote.
 */
export function get_price_quote (
  connector   : (query : PriceQuery) => PriceData,
  oracle_pk   : string,
  thold_price : number,
  req_stamp   : number,
  curr_stamp  : number = Util.now()
) {
  // Ensure that the price timestamp is not from the future.
  const query_stamp  = Math.min(req_stamp, curr_stamp)
  // Fetch the price interval data from the connector.
  const price_data   = connector({ close_stamp : curr_stamp, start_stamp : query_stamp, thold_price })
  // Format the price interval data.
  const quote_data   = format_price_data(price_data)
  // Define the quote as expired if a stop price is returned.
  const is_expired   = quote_data.stop_price !== null
  // Compute the threshold key.
  const thold_secret = get_threshold_key(HMAC_SECRET, DOMAIN, quote_data.quote_price, quote_data.quote_stamp, thold_price)
  // Compute a hash of the threshold key.
  const thold_hash   = Crypto.hash160(thold_secret)
  // Set the threshold key in the quote based on the expiration.
  const thold_key    = (is_expired) ? thold_secret : null
  // Define a template object for the request.
  const req_template = { ...quote_data, is_expired, oracle_pk, thold_hash, thold_price, thold_key }
  // Compute the hash id for the request.
  const req_id       = get_request_id(DOMAIN, req_template)
  // Create a signature for the request id.
  const req_sig      = Crypto.sign_ecdsa(req_id, CONST.SIGN_SECRET)
  // Return the price quote with a request id and signature.
  return { ...req_template, req_id, req_sig }
}

function format_price_data (data : PriceData) : QuoteData {
  return {
    curr_price  : data.close_price,
    curr_stamp  : data.close_stamp,
    quote_price : data.start_price,
    quote_stamp : data.start_stamp,
    stop_price  : data.stop_price,
    stop_stamp  : data.stop_stamp
  }
}

/**
 * Derives a threshold key for a given quote.
 * 
 * @param secret The master HMAC secret for the server.
 * @param price  The exchange price of the quote.
 * @param stamp  The timestamp of the quote.
 * @param thold  The threshold price of the quote.
 * @param label  Optional domain label.
 * @returns      Returns a threshold key. 
 */
function get_threshold_key (
  secret : string,
  domain : string,
  price  : number,
  stamp  : number,
  thold  : number
) {
  // Serialize the label into a buffer.
  const domain_bytes = Buff.str(domain)
  // Serialize the price into a buffer.
  const price_bytes  = Buff.num(price, 4)
  // Serialize the timestamp into a buffer.
  const stamp_bytes  = Buff.num(stamp, 4)
  // Serialize the threshold into a buffer.
  const thold_bytes  = Buff.num(thold, 4)
  // Compute the HMAC-256 hash of the preimage.
  return Crypto.hmac256(secret, domain_bytes, price_bytes, stamp_bytes, thold_bytes)
}

/**
 * Computes the hash identifier for a price quote.
 * 
 * @param template A template of the price quote.
 * @returns A 64-character hexadecimal hash identifier.
 */
function get_request_id (
  domain   : string,
  template : QuoteTemplate
) : string {
  // Serialize the template into a preimage.
  const preimage : QuotePreimage = [
    domain,
    template.oracle_pk,
    template.curr_price,
    template.curr_stamp,
    template.quote_price,
    template.quote_stamp,
    template.stop_price,
    template.stop_stamp,
    template.thold_hash,
    template.thold_key,
    template.thold_price
  ]
  // Serialize the preimage into a string buffer.
  const encoded = Util.serialize_json(preimage)
  // Compute the SHA-256 hash of the preimage.
  const digest  = Crypto.sha256(encoded)
  // Return the hash as a hexadecimal string.
  return Buff.uint(digest).hex
}
