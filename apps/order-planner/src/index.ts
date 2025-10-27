import { initDb, AppDataSource, Trade } from '@pair/db'
import { RatioSignal, TradeState } from '@pair/shared'
import { redis } from './redis'
import { logger } from './logger'

logger.info('Service starting...')

async function main() {
  await initDb()
  logger.info('Database initialized')

  const tradeRepository = AppDataSource.getRepository(Trade)

  async function planOrders() {
    while (true) {
      try {
        // Read current ratio from Redis
        const ratioStr = await redis.get('ratio')
        const signalStr = await redis.get('ratio_signal')

        if (!ratioStr || !signalStr) {
          logger.info('No ratio data available, waiting...')
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }

        const currentRatio = parseFloat(ratioStr)
        const signal: RatioSignal = JSON.parse(signalStr)

        logger.info(`Current ratio: ${currentRatio.toFixed(4)}`)

        // Check for trading opportunities (simplified logic)
        const targetRatio = 0.67 // Example target ratio
        const threshold = 0.01 // 1% deviation threshold

        if (Math.abs(currentRatio - targetRatio) > threshold) {
          logger.info(
            `Trading opportunity detected! Current: ${currentRatio.toFixed(4)}, Target: ${targetRatio.toFixed(4)}`
          )

          // Create a new trade record
          const trade = new Trade()
          trade.state = 'pending' as TradeState
          trade.ratio_target = targetRatio
          trade.ratio_last = currentRatio
          trade.size = 1000 // Example size

          await tradeRepository.save(trade)
          logger.info(`Created trade ${trade.id} with target ratio ${targetRatio}`)

          // Store trade ID in Redis for executor to pick up
          await redis.lpush('pending_trades', trade.id)
        } else {
          logger.info('No trading opportunity - ratio within threshold')
        }

        await new Promise((r) => setTimeout(r, 3000))
      } catch (error) {
        logger.error('Error in planning loop:', { error })
        await new Promise((r) => setTimeout(r, 5000))
      }
    }
  }

  await planOrders()
}

main().catch((error) => logger.error('Fatal error:', { error }))
