import { Buff }           from '@cmdcode/buffy'
import { PriceGenerator } from './generate.js'

import type { QuoteTemplate } from '../types.js'

import * as CONST  from '../const.js'
import * as Crypto from './crypto.js'
import * as Util   from './util.js'

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
  price_gen   : PriceGenerator,
  oracle_pk   : string,
  thold_price : number,
  req_stamp   : number,
  curr_stamp  : number = Util.now()
) {
  // Ensure that the price timestamp is not from the future.
  const query_stamp  = Math.min(req_stamp, curr_stamp)
  // Fetch a price interval from the generator.
  const price_data   = price_gen.simulate(query_stamp, thold_price, curr_stamp)
  // Unpack the price interval data.
  const { quote_price, quote_stamp, stop_price } = price_data
  // Define the quote as expired if a stop price is returned.
  const is_expired   = stop_price !== null
  // Compute the threshold key.
  const thold_secret = get_threshold_key(CONST.HMAC_SECRET, quote_price, quote_stamp, thold_price)
  // Compute a hash of the threshold key.
  const thold_hash   = Crypto.hash160(thold_secret)
  // Set the threshold key in the quote based on the expiration.
  const thold_key    = (is_expired) ? thold_secret : null
  // Define a template object for the request.
  const req_template = { ...price_data, curr_stamp, is_expired, oracle_pk, thold_hash, thold_price, thold_key }
  // Compute the hash id for the request.
  const req_id       = get_request_id(req_template)
  // Create a signature for the request id.
  const req_sig      = Crypto.sign_ecdsa(req_id, CONST.SIGN_SECRET)
  // Return the price quote with a request id and signature.
  return { ...req_template, req_id, req_sig }
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
  price  : number,
  stamp  : number,
  thold  : number,
  label  : string = 'exchange/quote'
) {
  const label_bytes = Buff.str(label)
  const price_bytes = Buff.num(price, 4)
  const stamp_bytes = Buff.num(stamp, 4)
  const thold_bytes = Buff.num(thold, 4)
  return Crypto.hmac256(secret, label_bytes, price_bytes, stamp_bytes, thold_bytes)
}

/**
 * Computes the hash identifier for a price quote.
 * 
 * @param template A template of the price quote.
 * @returns A 64-character hexadecimal hash identifier.
 */
function get_request_id (template : QuoteTemplate) : string {
  // Serialize the template into a preimage.
  const preimage = Util.serialize_json([
    template.curr_price,
    template.curr_stamp,
    template.is_expired,
    template.oracle_pk,
    template.quote_price,
    template.quote_stamp,
    template.stop_price,
    template.stop_stamp,
    template.thold_hash,
    template.thold_key,
    template.thold_price
  ])
  // Compute the SHA-256 hash of the preimage.
  const digest = Crypto.sha256(preimage)
  // Return the hash as a hexadecimal string.
  return Buff.uint(digest).hex
}
