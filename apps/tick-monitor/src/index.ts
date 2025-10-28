import { RatioValue, TickValue } from '@pear/shared'
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

    const tickA: TickValue = {
      assetId: 'A',
      price: priceA,
      timestamp: Date.now(),
    }

    const tickB: TickValue = {
      assetId: 'B',
      price: priceB,
      timestamp: Date.now(),
    }

    const ratioValue: RatioValue = {
      pairId: 'A:B',
      ratio,
      timestamp: Date.now(),
    }

    // Set the tick data and ratio in redis
    await Promise.all([redis.setTickData(tickA), redis.setTickData(tickB), redis.setPearRatio(ratioValue)])

    // Publish the ratio to the orchestrator
    await TickPublisher.publishPearRatio(ratioValue)

    // Log the ratio
    if (Config.VERBOSE) {
      logger.info(`Updated ratio=${ratio.toFixed(4)} (A=${priceA.toFixed(2)}, B=${priceB.toFixed(2)})`)
    }

    await new Promise((r) => setTimeout(r, 10))
  }
}

loop().catch((error) => logger.error('Fatal error:', { error }))
