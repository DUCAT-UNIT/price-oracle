import { Assert, now } from './util.js'

import type { PriceGenConfig, PricePoint, PriceSimulation } from '../types.js'

const DEFAULT_CONFIG : PriceGenConfig = {
  initial_stamp     : now() - 100_000,
  initial_price     : 50000,
  min_price         : 25000,
  max_price         : 200000,
  volatility        : 0.03,      // Reduced to 3% for balanced movement
  time_step         : 5,         // 5 second steps
  trend_strength    : 0.0005,    // Reduced to 0.05% for gentler upward drift
  momentum_factor   : 0.3,       // Moderate momentum
  shock_probability : 0.01,      // 1% chance of shocks
  shock_magnitude   : 0.1,       // 10% max shock size
  crash_interval    : 100,       // Crash every 100 steps (500 seconds)
  crash_magnitude   : 0.15,      // Increased to 15% for more significant crashes.
  verbose           : false
}

// Random number generator with seed
class SeededRNG {
  private seed   : number
  private current: number

  constructor(seed: number) {
    this.seed    = seed
    this.current = seed
  }

  // Reset to initial seed
  reset(): void {
    this.current = this.seed
  }

  // Generate a random number between 0 and 1.
  next(): number {
    // Xorshift32 algorithm for better randomness
    this.current ^= this.current << 13
    this.current ^= this.current >>> 17
    this.current ^= this.current << 5
    return (this.current >>> 0) / 0xFFFFFFFF
  }
}

export class PriceGenerator {
  private config   : PriceGenConfig
  private rng      : SeededRNG
  private momentum : number = 0

  constructor(options : Partial<PriceGenConfig> = {}) {
    // Initialize the configuration.
    this.config = { ...DEFAULT_CONFIG, ...options }
    // Initialize the random number generator.
    this.rng    = new SeededRNG(this.config.initial_stamp)
    // Validate the configuration.
    this.validate_config()

    if (this.config.verbose) {
      console.log(`[ pricegen ] start price: ${this.start_price}, start time: ${this.start_time}`)
    }
  }

  get start_price() : number {
    return this.config.initial_price
  }

  get start_time() : number {
    return this.config.initial_stamp
  }

  // Generate price simulation up to end_time with threshold and quote timestamp
  simulate(
    req_stamp : number,
    threshold : number,
    end_time  : number = now()
  ): PriceSimulation {
    // Assert that the input parameters are valid.
    Assert.ok(end_time >= this.start_time, 'End time must be after start time')
    Assert.ok(this.start_price > threshold, 'Initial price must be above threshold')
    Assert.ok(req_stamp >= this.start_time && req_stamp <= end_time, 'Quote timestamp must be between start and end time')
    // Log the simulation parameters.
    if (this.config.verbose) {
      console.log(`[ pricegen ] simulate req_stamp: ${req_stamp}, threshold: ${threshold}, end_time: ${end_time}`)
    }
    // Reset the random number generator and momentum.
    this.rng.reset()
    this.momentum = 0
    // Compute the number of steps to simulate.
    const steps = Math.floor((end_time - this.start_time) / this.config.time_step)
    // Initialize the current price and stopped price.
    let current_price : number = this.start_price
    let min_time_diff : number = Infinity
    let stopped_at    : PricePoint | null = null
    let closest_quote : PricePoint | null = null
    // Simulate the price movement.
    for (let i = 0; i <= steps; i++) {
      // Compute the timestamp for the current step.
      const timestamp = this.start_time + i * this.config.time_step
      // Set the verbose flag.
      const verbose = (this.config.verbose && stopped_at === null)
      // Compute the next price for the current step.
      current_price = this.next_price(current_price, i, timestamp, verbose)
      // Compute the price point for the current step.
      const point = { 
        price     : Math.round(current_price), 
        timestamp : timestamp 
      }
      // Find the closest quote timestamp.
      const time_diff = Math.abs(timestamp - req_stamp)
      if (time_diff < min_time_diff) {
        min_time_diff = time_diff
        closest_quote = point
      }
      // Check if the price has dropped below the threshold.
      if (stopped_at === null && timestamp > req_stamp && current_price <= threshold) {
        stopped_at = point
      }
    }
    // Assert that a quote price point was found.
    Assert.exists(closest_quote, 'Failed to find a quote price point')
    // Return the simulation result.
    return {
      curr_price    : Math.round(current_price),
      quote_price   : closest_quote.price,
      quote_stamp   : closest_quote.timestamp,
      stop_price    : stopped_at?.price ?? null,
      stop_stamp    : stopped_at?.timestamp ?? null
    }
  }

  private next_price (
    current_price : number,
    step          : number,
    timestamp     : number,
    verbose       : boolean = false
  ) : number {
    // Base random movement (Brownian motion-like).
    const random_move = (this.rng.next() - 0.5) * 2 * this.config.volatility * current_price
    // Trend component.
    const trend = current_price * this.config.trend_strength
    // Momentum component.
    const momentum_effect = this.momentum * this.config.momentum_factor
    this.momentum = random_move
    // Random shock component.
    const shock_chance = this.rng.next()
    const shock = shock_chance < this.config.shock_probability
      ? (this.rng.next() - 0.5) * 2 * current_price * this.config.shock_magnitude
      : 0
    // Regular crash component.
    const is_crash_step = step % this.config.crash_interval === 0 && step > 0
    const crash = is_crash_step ? -current_price * this.config.crash_magnitude : 0
    // Calculate the new price and enforce boundaries.
    const new_price = Math.max(
      this.config.min_price,
      Math.min(this.config.max_price, current_price + random_move + trend + momentum_effect + shock + crash)
    )
    // Logging for first 10 steps and crash steps.
    if (verbose && (step < 10 || is_crash_step)) {
      console.log(`step: ${step}`)
      console.log(`\\---[ price: ${Math.round(new_price)} , stamp: ${timestamp}`.padEnd(50) + ']')
      console.log(` \\--[ random: ${Math.round(random_move)}, trend: ${Math.round(trend)}, momentum: ${Math.round(momentum_effect)}`.padEnd(50) + ']')
      console.log(`  \\-[ shock: ${Math.round(shock)}, crash: ${Math.round(crash)}`.padEnd(50) + ']')
    }

    return new_price;
  }

  private validate_config() {
    Assert.ok(this.config.initial_price >= this.config.min_price, 'Initial price below minimum');
    Assert.ok(this.config.initial_price <= this.config.max_price, 'Initial price above maximum');
    Assert.ok(this.config.time_step > 0, 'Time step must be positive');
    Assert.ok(this.config.volatility >= 0, 'Volatility must be non-negative');
    Assert.ok(this.config.shock_probability >= 0 && this.config.shock_probability <= 1, 'Shock probability must be between 0 and 1');
    Assert.ok(this.config.crash_interval > 0, 'Crash interval must be positive');
    Assert.ok(this.config.crash_magnitude >= 0 && this.config.crash_magnitude <= 1, 'Crash magnitude must be between 0 and 1');
  }
}