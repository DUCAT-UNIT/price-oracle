import { QUEUE_INTERVAL } from '../const.js'

type RequestPriority = 'high' | 'low'

interface QueueItem<T = any> {
  promise   : Promise<T>
  priority  : RequestPriority
  timestamp : number
}

export class RequestQueue {
  private readonly _queue : QueueItem[] = []
  private readonly _ival  : number      = QUEUE_INTERVAL
  
  private _lock     : boolean      = false
  private _last_req : number       = 0
  private _timer    : Timer | null = null

  constructor() {}

  get is_locked(): boolean {
    return this._lock
  }

  get size(): number {
    return this._queue.length
  }

  /**
   * Add a promise to the queue with a specified priority
   * @param promise - The promise to be executed
   * @param priority - The priority of the promise
   * @returns A promise that resolves with the result of the original promise
   */
  public enqueue<T>(
    promise: Promise<T>,
    priority: RequestPriority = 'low'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Create a wrapper promise that will be executed by the queue
      const wrapper = new Promise<T>((innerResolve, innerReject) => {
        // Execute the original promise
        promise
          .then(result => {
            innerResolve(result)
            resolve(result)
          })
          .catch(error => {
            innerReject(error)
            reject(error)
          })
      })

      const queue_item: QueueItem<T> = {
        promise: wrapper,
        priority,
        timestamp: Date.now()
      }
      
      // Add to queue based on priority
      if (priority === 'high') {
        // Insert high priority items at the beginning
        this._queue.unshift(queue_item)
      } else {
        // Add low priority items at the end
        this._queue.push(queue_item)
      }
      
      console.log(`[  queue  ] Enqueued promise with ${priority} priority. Queue size: ${this._queue.length}`)
      
      // Start processing if not already running
      if (!this._lock && !this._timer) {
        this.start()
      }
    })
  }

  /**
   * Process the next item in the queue
   */
  private async next(): Promise<void> {
    if (this._queue.length === 0) {
      this._lock = false
      return
    }

    this._lock = true
    
    // Check if enough time has passed since the last request
    const now = Date.now()
    const timeSinceLastRequest = now - this._last_req
    
    if (timeSinceLastRequest < this._ival) {
      // Wait for the remaining time before processing the next request
      const waitTime = this._ival - timeSinceLastRequest
      setTimeout(() => this.next(), waitTime)
      return
    }
    
    // Get the next item from the queue
    const item = this._queue.shift()
    if (!item) {
      this._lock = false
      return
    }
    
    // Update the last request time
    this._last_req = Date.now()
    
    console.log(`[ queue ] Processing promise with ${item.priority} priority. Queue size: ${this._queue.length}`)
    
    try {
      // Execute the promise
      await item.promise
    } catch (error) {
      console.error(`[ queue ] Error processing promise:`, error)
    }
    
    // Process the next item
    setTimeout(() => this.next(), 0)
  }

  /**
   * Start the queue processor
   */
  public start(): void {
    // If the timer is already running, return.
    if (this._timer) return
    // Process the queue immediately.
    this.next()
    // Set up a timer to check the queue periodically.
    this._timer = setInterval(() => {
      if (this._queue.length > 0 && !this._lock) {
        this.next()
      }
    }, this._ival)
    // Log the start of the queue processor.
    console.log('[ queue ] Started promise queue processor')
  }

  /**
   * Stop the queue processor
   */
  public stop(): void {
    // If the timer is not running, return.
    if (!this._timer) return
    // Clear the timer.
    clearInterval(this._timer)
    // Set the timer to null.
    this._timer = null
    // Log the stop of the queue processor.
    console.log('[ queue ] Stopped promise queue processor')
  }
} 