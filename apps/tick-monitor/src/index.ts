import { RatioValue } from '@pair/shared'
import { redis, logger } from './services'
import { TickPublisher } from './publisher'
import { Config } from './config'

logger.info('Service starting...')

/**
 * Obviously this should be a websocket connection to an exchange, subscribing to
 * updates for the prices of the assets and computing the ratio. It does not care
 * about target threshold ratios, it just computes and publishes the ratio. This way
 * the order planner can subscribe to the ratio and decide whether to place an order.
 */
async function loop() {
  while (true) {
    const priceA = 100 + Math.random() * 20
    const priceB = 150 + Math.random() * 20
    const ratio = priceA / priceB

    const value: RatioValue = {
      pairId: 'A:B',
      priceA: priceA,
      priceB: priceB,
      ratio,
      timestamp: Date.now(),
    }

    // Set the ratio in redis
    await redis.setPearRatio(value)

    // Publish the ratio
    await TickPublisher.publishPearRatio(value)

    // Log the ratio
    if (Config.VERBOSE) {
      logger.info(`Updated ratio=${ratio.toFixed(4)} (A=${priceA.toFixed(2)}, B=${priceB.toFixed(2)})`)
    }

    await new Promise((r) => setTimeout(r, 2000))
  }
}

loop().catch((error) => logger.error('Fatal error:', { error }))
