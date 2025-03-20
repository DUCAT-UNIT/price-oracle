# price-oracle

Price Oracle server for the DUCAT protocol. 

## Overview

This project implements a price oracle for the DUCAT protocol. This oracle provides  a price quote of the BTC/USD exchange rate. These price quotes are used to price bitcoin-backed vaults in the DUCAT protocol, and to control liquidation events.

Each quote requires a threshold price. The threshold price is used to generate a cryptographic key (hidden) and hash (public). This hash is used by the DUCAT protocol to guard the liquidation spending path of a vault.

Users can request a quote for the latest price, or for a price/threshold in the past. For past quotes, the oracle will check its price history (from the quote timestamp to the current time) to see if the price has since crossed the threshold price.

If the price has crossed the threshold price since the quote timestamp, the oracle will return the quote with the threshold key revealed. This allows the DUCAT protocol to spend vaults that are locked using the past quote and threshold price.

Each quote is signed by the oracle operator's public key, and can be verified by anyone.

## Setup

Please see the `sample.env` file to set up the environment variables. For additional configuration of the price generator, see the `config.json` file.

## Usage

To start the oracle, run:

```bash
bun run start
```

This will start the oracle on port `8082` by default. You can change the port by setting the `SERVER_PORT` environment variable.

## API

The oracle API has a single endpoint: `/api/quote`. This endpoint can be used to get a quote for the latest price, or for a price/threshold in the past.

This endpoint accepts the following query parameters:

* `th`: Required. The threshold price.
* `ts`: Optional. The timestamp of the quote (for past quotes).
* `cs`: Optional. For development, set this to override the current time.

Example requests:

```bash
# Get the latest quote
curl -X GET "http://localhost:8082/api/quote?th=25000"

# Get a quote for the past price/threshold
curl -X GET "http://localhost:8082/api/quote?th=10000&ts=1716278400"

# Get a quote for the past price/threshold, but returned as the latest price.
curl -X GET "http://localhost:8082/api/quote?th=10000&ts=1716278400&cs=1716278400"
```

## Price Generator

The price generator will deterministically generate prices based on the `initial_stamp` value in the `config.json` file.

The price generator is designed to simulate market conditions, and will generate prices that are either trending up or down.

The price generator will also randomly generate crashes to the price, allowing you to test the liquidation logic for the DUCAT protocol.

The behavior of the price generator can be configured in the `config.json` file.

## Development / Testing

You can configure the price generator to output to the console for local development, by setting the `verbose` option to `true` in the `config.json` file.

The `cs` query parameter can be used to override the current time for testing purposes. For example, you can return a quote for a past price/threshold as the latest price by setting `cs` to the timestamp of the quote.

Combined with the `verbose` option, this allows you to test the oracle's response to a past price/threshold, and generate pairs of quotes and thresholds to test the DUCAT protocol's liquidation logic.

## Cryptography

The threshold keys are generated using an HMAC function, using a secret key stored by the oracle operator. Each threshold key is generated using the following formula:

```
HMAC(secret_key, domain_label, quote_price, quote_stamp, thold_price)
```

The threshold key is then hashed using `ripemd160(SHA-256(threshold_key))` to create the threshold hash.

Price quotes are hashed into an `req_id` identifer using SHA-256, and signed by the oracle operator's public key using ECDSA.
