export type PriceQuote = ActiveQuote | ExpiredQuote

export type QuotePreimage = [
  domain_label : string,
  oracle_pk    : string,
  curr_stamp   : number,
  quote_price  : number,
  quote_stamp  : number,
  is_expired   : boolean,
  stop_price   : number | null,
  stop_stamp   : number | null,
  thold_key    : string | null,
  thold_hash   : string,
  thold_price  : number,
]

export interface QuoteTemplate {
  curr_price  : number
  curr_stamp  : number
  is_expired  : boolean
  oracle_pk   : string
  quote_price : number
  quote_stamp : number
  stop_price  : number | null,
  stop_stamp  : number | null,
  thold_hash  : string
  thold_key   : string | null,
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

// Configuration interface
export interface PriceGenConfig {
  initial_stamp     : number  // Starting timestamp
  initial_price     : number  // Starting price
  min_price         : number  // Lower price boundary
  max_price         : number  // Upper price boundary
  volatility        : number  // Base volatility as percentage (0-1)
  time_step         : number  // Seconds per simulation step
  trend_strength    : number  // Overall market trend strength (-1 to 1)
  momentum_factor   : number  // How much recent changes affect future ones
  shock_probability : number  // Chance of sudden price shocks (0-1)
  shock_magnitude   : number  // Max size of price shocks as percentage
  crash_interval    : number  // Number of steps between regular crashes
  crash_magnitude   : number  // Size of regular price crashes as percentage (0-1)
  verbose           : boolean // Whether to log the price simulation.
}

// Price point interface
export interface PricePoint {
  price     : number  // Current price
  timestamp : number  // Timestamp of this price
}

// Simulation result
export interface PriceSimulation {
  curr_price    : number            // Current price
  quote_price   : number            // Price at requested timestamp
  quote_stamp   : number            // Timestamp of requested price
  stop_price    : number | null     // Price at threshold, or null if not hit
  stop_stamp    : number | null     // Timestamp of threshold, or null if not hit
}