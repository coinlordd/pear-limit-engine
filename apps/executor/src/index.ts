import { TradeState } from '@pear/shared'
import { initDb, AppDataSource, Trade } from '@pear/db'
import { redis } from './redis'
import { logger } from './logger'

logger.info('Service starting...')

async function main() {
  await initDb()
  logger.info('Database initialized')

  const tradeRepository = AppDataSource.getRepository(Trade)

  async function executeOrders() {
    while (true) {
      try {
        // Get next pending trade from Redis queue
        const tradeId = await redis.rpop('pending_trades')

        if (!tradeId) {
          logger.info('No pending trades, waiting...')
          await new Promise((r) => setTimeout(r, 2000))
          continue
        }

        logger.info(`Processing trade ${tradeId}`)

        // Fetch trade from database
        const trade = await tradeRepository.findOne({ where: { id: tradeId } })

        if (!trade) {
          logger.warn(`Trade ${tradeId} not found in database`)
          continue
        }

        // Update trade state to executing
        trade.state = 'executing' as TradeState
        await tradeRepository.save(trade)
        logger.info(`Updated trade ${tradeId} to executing state`)

        // Simulate order execution (mock)
        logger.info(`Placing orders for trade ${tradeId}:`)
        logger.info(`  - Target ratio: ${trade.ratio_target}`)
        logger.info(`  - Current ratio: ${trade.ratio_last}`)
        logger.info(`  - Size: ${trade.size}`)

        // Simulate execution delay
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))

        // Simulate partial execution
        const executionResult = {
          ordersPlaced: 2,
          filledAmount: trade.size * 0.7, // 70% filled
          avgPrice: trade.ratio_target * (0.98 + Math.random() * 0.04), // ±2% variance
          timestamp: new Date().toISOString(),
        }

        trade.state = 'partial' as TradeState
        trade.result = executionResult
        await tradeRepository.save(trade)

        logger.info(`Trade ${tradeId} executed partially:`, { executionResult })

        // Move to finalizer queue
        await redis.lpush('partial_trades', tradeId)
        logger.info(`Moved trade ${tradeId} to finalizer queue`)
      } catch (error) {
        logger.error('Error in execution loop:', { error })
        await new Promise((r) => setTimeout(r, 5000))
      }
    }
  }

  await executeOrders()
}

main().catch((error) => logger.error('Fatal error:', { error }))
