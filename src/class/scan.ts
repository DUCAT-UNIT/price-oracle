import { now } from '../lib/util.js'
import { PRICE_IVAL } from '../const.js'
import { GENESIS_STAMP } from '../const.js'

import type { PriceOracle } from './price.js'
import type { PricePoint } from '../types/index.js'

/**
 * GapFiller class for detecting and filling gaps in price data
 */
export class PriceScanner {
  private readonly _client  : PriceOracle
  private readonly _failed  : Set<number> = new Set()

  private _running : boolean = false
  private _timer   : Timer | null = null
  private _last_scan : number = 0  // Track the last scan time
  private _scan_in_progress : boolean = false  // Track if a scan is currently in progress
  
  // Configuration constants
  private readonly WINDOW_SIZE      : number = 24 * 60 * 60 // 24 hours in seconds
  private readonly WINDOW_IVAL      : number = 24 * 60 * 60 // Changed to 24 hours to match window size
  private readonly MAX_QUEUE_SIZE   : number = 50          // Reduced from 100 to 50 to prevent queue buildup
  private readonly CHUNK_DELAY_MS   : number = 100         // Increased from 50ms to 100ms to give more time for processing
  private readonly BATCH_SIZE       : number = 10          // Reduced from 20 to 10 to process smaller batches
  private readonly SCAN_INTERVAL_MS : number = 5000         // 5 seconds between scans
  private readonly MIN_GAP_SIZE     : number = 24 * 60 * 60 // Changed to 24 hours to match window size
  private readonly MAX_RETRIES      : number = 3            // Maximum number of retries for failed fetches
  
  constructor(client: PriceOracle) {
    this._client = client
  }

  public get is_running(): boolean {
    return this._running
  }
  
  /**
   * Start the gap filler process
   */
  public start(): void {
    if (this._running) {
      console.warn('[ scanner ] Scanner is already running')
      return
    }
    
    console.log('[ scanner ] Starting price scanner')
    this._running = true
    
    // Run a single scan from genesis to now
    const current_time = now()
    this._last_scan = GENESIS_STAMP  // No need to convert, already in seconds
    console.log(`[ scanner ] Running scan from ${formatDate(this._last_scan)} to ${formatDate(current_time)}`)
    
    // Use an async function to handle the scan
    const runScan = async (): Promise<void> => {
      await this.scan(this._last_scan, current_time)
      console.log('[ scanner ] Scan completed')
    }
    
    // Execute the async function
    runScan()
  }
  
  /**
   * Stop the gap filler process
   */
  public stop(): void {
    if (!this._running) {
      console.warn('[ gap_filler ] Gap filler is not running')
      return
    }
    
    console.log('[ gap_filler ] Stopping gap filler')
    this._running = false
    
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }
  
  /**
   * Scan for gaps in price data and queue requests to fill them
   * @param start_stamp The starting timestamp to begin the search
   * @param end_stamp The ending timestamp to stop the search (defaults to now)
   */
  private async scan (
    start_stamp : number,
    end_stamp   : number = now()
  ): Promise<void> {
    if (!this._running) return
    
    // Ensure we have a valid time range
    if (start_stamp >= end_stamp) {
      console.log(`[ scanner ] Invalid time range: start (${formatDate(start_stamp)}) >= end (${formatDate(end_stamp)})`)
      return
    }
    
    // Prevent multiple scans from running simultaneously
    if (this._scan_in_progress) {
      console.log(`[ scanner ] Scan already in progress, skipping this scan`)
      return
    }
    
    this._scan_in_progress = true
    
    try {
      // Calculate the total number of windows based on the time range and window size
      const total_time_range = end_stamp - start_stamp
      const total_windows = Math.ceil(total_time_range / this.WINDOW_SIZE)
      let processed_windows = 0
      
      console.log(`[ scanner ] Starting scan from ${formatDate(start_stamp)} to ${formatDate(end_stamp)} (window size: ${this.WINDOW_SIZE/3600} hours, total windows: ${total_windows})`)
      
      // Process windows in reverse chronological order
      for (let current_end = end_stamp; current_end > start_stamp; current_end -= this.WINDOW_SIZE) {
        if (!this._running) return
        
        // Calculate the start of the current window
        const current_start = Math.max(current_end - this.WINDOW_SIZE, start_stamp)
        const window_start = formatDate(current_start)
        const window_end = formatDate(current_end)
        processed_windows++
        const progress = (processed_windows / total_windows * 100).toFixed(1)
        console.log(`\n[ scanner ] Processing window ${window_start} to ${window_end} (${progress}% complete, window ${processed_windows}/${total_windows})`)
        
        // Get the existing price points in this time range
        const saved_points = this._client.db.get_price_history(current_start, current_end)
        console.log(`[ scanner ] Found ${saved_points.length} existing price points in window`)
        
        // Define the gaps array
        const gaps: number[] = []
        
        // Define the expected time
        let expected_time = current_start
        
        // Log the first and last points if they exist
        if (saved_points.length > 0) {
          console.log(`[ scanner ] First point in window: ${formatDate(saved_points[0].stamp)} (${saved_points[0].price})`)
          console.log(`[ scanner ] Last point in window: ${formatDate(saved_points[saved_points.length - 1].stamp)} (${saved_points[saved_points.length - 1].price})`)
        }
        
        // Iterate over the existing price points
        for (const point of saved_points) {
          // If there's a gap larger than the minimum gap size
          if (point.stamp - expected_time > this.MIN_GAP_SIZE) {
            const gap_size = point.stamp - expected_time
            const gap_start = formatDate(expected_time)
            const gap_end = formatDate(point.stamp)
            console.log(`[ scanner ] Found gap of ${(gap_size/3600).toFixed(1)} hours from ${gap_start} to ${gap_end}`)
            
            // Record the missing timestamps
            for (let gap_time = expected_time; gap_time < point.stamp; gap_time += this.WINDOW_IVAL) {
              if (!this._failed.has(gap_time)) {
                gaps.push(gap_time)
              }
            }
          }
          expected_time = point.stamp + this.WINDOW_IVAL
        }
        
        // Check for gap at the end of the window
        if (expected_time < current_end && current_end - expected_time >= this.MIN_GAP_SIZE) {
          const gap_size = current_end - expected_time
          const gap_start = formatDate(expected_time)
          const gap_end = formatDate(current_end)
          console.log(`[ scanner ] Found gap of ${(gap_size/3600).toFixed(1)} hours at end of window from ${gap_start} to ${gap_end}`)
          
          for (let gap_time = expected_time; gap_time < current_end; gap_time += this.WINDOW_IVAL) {
            if (!this._failed.has(gap_time)) {
              gaps.push(gap_time)
            }
          }
        }
        
        // If we found gaps, queue them for fetching
        if (gaps.length > 0) {
          console.log(`[ scanner ] Queueing ${gaps.length} gaps for fetching`)
          
          // Process gaps in batches
          for (let i = 0; i < gaps.length; i += this.BATCH_SIZE) {
            if (!this._running) return
            
            const batch = gaps.slice(i, i + this.BATCH_SIZE)
            console.log(`[ scanner ] Processing batch ${Math.floor(i/this.BATCH_SIZE) + 1}/${Math.ceil(gaps.length/this.BATCH_SIZE)} (${batch.length} gaps)`)
            
            // Only check queue size if it's getting close to the limit
            if (this._client.queue.size >= this.MAX_QUEUE_SIZE * 0.8) {
              console.log(`[ scanner ] Queue size (${this._client.queue.size}) near limit, pausing briefly`)
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
            
            // Queue each gap in the batch
            for (const gapTime of batch) {
              // For hourly data, we need to fetch the entire hour
              // So we set the window to 1 hour before and after the gap time
              const window = this.WINDOW_IVAL
              console.log(`[ scanner ] Queueing fetch for gap at ${formatDate(gapTime)}`)
              
              // Add retry logic for failed fetches
              let retries = 0;
              let success = false;
              
              while (retries < this.MAX_RETRIES && !success) {
                try {
                  // Fetch the entire window at once instead of small chunks
                  const points = await this._client.api.get_price_history(gapTime, gapTime + this.WINDOW_SIZE)
                  if (points.length > 0) {
                    console.log(`[ scanner ] Retrieved ${points.length} price points for window starting at ${formatDate(gapTime)}`)
                  }
                  success = true;
                } catch (error) {
                  retries++;
                  console.log(`[ scanner ] Failed to fetch gap at ${formatDate(gapTime)}: ${error} (retry ${retries}/${this.MAX_RETRIES})`)
                  if (retries >= this.MAX_RETRIES) {
                    this._failed.add(gapTime)
                  } else {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries))
                  }
                }
              }
            }
            
            // Small delay between batches to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, this.CHUNK_DELAY_MS))
          }
        } else {
          console.log(`[ scanner ] No gaps found in window`)
        }
        
        // Minimal delay between windows
        await new Promise(resolve => setTimeout(resolve, this.CHUNK_DELAY_MS))
      }
      
      console.log(`[ scanner ] Completed scan from ${formatDate(start_stamp)} to ${formatDate(end_stamp)}`)
    } finally {
      // Always release the scan lock when done
      this._scan_in_progress = false
    }
  }
}

/**
 * Format a Unix timestamp to calendar date string (YYYY-MM-DD)
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0]; // Extract just the YYYY-MM-DD part
}