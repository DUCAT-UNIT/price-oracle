

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
