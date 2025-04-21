import { now }           from '../lib/util.js'
import { GENESIS_STAMP } from '../const.js'

import type { PriceOracle } from './price.js'
import type { PricePoint }  from '../types/index.js'

const MAX_RETRIES = 3   // Maximum number of retries for failed fetches
const FETCH_DELAY = 100 // Increased from 50ms to 100ms to give more time for processing

/**
 * GapFiller class for detecting and filling gaps in price data
 */
export class PriceScanner {
  private readonly _client      : PriceOracle
  private readonly _failed      : Set<number> = new Set()
  private readonly _price_ival  : number
  private readonly _window_size : number

  constructor (
    client      : PriceOracle,
    price_ival  : number,
    window_size : number,
  ) {
    this._client      = client
    this._price_ival  = price_ival
    this._window_size = window_size
  }

  /**
   * Scan for gaps in the price data, and fetch the missing data from the provider.
   * @param start_stamp The starting timestamp to begin the search
   * @param end_stamp   The ending timestamp to stop the search (defaults to now)
   */
  async scan (
    start_stamp : number = GENESIS_STAMP,
    end_stamp   : number = now()
  ): Promise<void> {
    // Ensure we have a valid time range.
    if (start_stamp >= end_stamp) {
      console.log(`[ scanner ] invalid time range: start (${formatDate(start_stamp)}) >= end (${formatDate(end_stamp)})`)
      return
    }

    // Log the start of the scan.
    console.log(`[ scanner ] Running scan from ${formatDate(start_stamp)} to ${formatDate(end_stamp)}`)

    // Calculate the total time range, and the number of time windows to process.
    const time_range   = end_stamp - start_stamp
    const window_count = Math.ceil(time_range / this._window_size)

      let processed_windows = 0
      
      console.log(`[ scanner ] starting scan from ${formatDate(start_stamp)} to ${formatDate(end_stamp)} (total windows: ${window_count})`)
      
    // Process windows in reverse chronological order.
    for (let window_end = end_stamp; window_end > start_stamp; window_end -= this._window_size) {
        
        // Calculate the start of the current window.
        const window_start = Math.max(window_end - this._window_size, start_stamp)

        // Increment the processed windows counter.
        processed_windows++

        // Calculate the progress percentage.
        const progress = (processed_windows / window_count * 100).toFixed(1)

        console.log(`[ scanner ] checking window ${processed_windows}/${window_count} from ${formatDate(window_start)} to ${formatDate(window_end)} (${progress}% complete)`)
        
        // Get the existing price points in this time range.
        const saved_points = this._client.db.get_price_history(window_start, window_end)
        
        // Define the gaps array. 
        const gaps: number[] = []
        
        // Define the expected time.
        let expected_time = window_start
        
        // Iterate over the existing price points
        for (const point of saved_points) {
          // If there's a gap larger than the minimum gap size,
          if (point.stamp - expected_time > this._window_size) {
            // Calculate the gap size.
            const gap_size  = point.stamp - expected_time

            console.log(`[ scanner ] found gap of ${(gap_size/this._price_ival).toFixed(1)} hours from ${formatDate(expected_time)} to ${formatDate(point.stamp)}`)
            
            // Record the missing timestamps
            for (let gap_time = expected_time; gap_time < point.stamp; gap_time += this._window_size) {
              if (!this._failed.has(gap_time)) {
                gaps.push(gap_time)
              }
            }
          }
          expected_time = point.stamp + this._window_size
        }
        
        // Check for gaps at the end of the window.
        if (expected_time < window_end && window_end - expected_time >= this._window_size) {
          // Calculate the gap size.
          const gap_size = window_end - expected_time

          console.log(`[ scanner ] found gap of ${(gap_size/this._price_ival).toFixed(1)} hours at end of window from ${formatDate(expected_time)} to ${formatDate(window_end)}`)
          
          for (let gap_time = expected_time; gap_time < window_end; gap_time += this._window_size) {
            if (!this._failed.has(gap_time)) {
              gaps.push(gap_time)
            }
          }
        }
        
        // If we found gaps in the price history,
        if (gaps.length > 0) {

          console.log(`[ scanner ] queueing ${gaps.length} gaps for fetching`)
          
          // For each gap in the price history,
          for (const gap_time of gaps) {
              
            // Add retry logic for failed fetches.
            let retries = 0, success = false
            
            while (retries < MAX_RETRIES && !success) {
              try {
                // Fetch the entire window at once instead of small chunks
                const points = await this._client.api.get_price_history(gap_time, gap_time + this._window_size)
                if (points.length > 0) {
                  console.log(`[ scanner ] retrieved ${points.length} price points for window starting at ${formatDate(gap_time)}`)
                }
                success = true
              } catch (error) {
                retries++
                console.log(`[ scanner ] failed to fetch gap at ${formatDate(gap_time)}: ${error} (retry ${retries}/${MAX_RETRIES})`)
                if (retries >= MAX_RETRIES) {
                  this._failed.add(gap_time)
                } else {
                  // wait before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000 * retries))
                }
              }
            }
          }
        }
        
        // Minimal delay between windows.
        await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
      }
      
    console.log(`[ scanner ] Completed scan from ${formatDate(start_stamp)} to ${formatDate(end_stamp)}`)
  }
}

/**
 * Format a Unix timestamp to calendar date string (YYYY-MM-DD)
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toISOString().split('T')[0] // Extract just the YYYY-MM-DD part
}