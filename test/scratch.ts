import { PriceOracle }  from '../src/index.js'
import { PriceFetcher } from '../src/fetcher/index.js'
import { now }          from '../src/lib/util.js'

/* ======== [ Initial Setup ] ======== */

const fetcher = PriceFetcher.gecko
const oracle  = new PriceOracle('test/db.sqlite', fetcher)

/* ======== [ Fetch Price History ] ======== */

// Get the current timestamp, minus 12 hours.
const stamp = now() - (60 * 60 * 12)

console.log('current stamp :', stamp)

oracle.start()
