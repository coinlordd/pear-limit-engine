import { TradeState } from '@pair/shared'
import { initDb, AppDataSource, Trade } from '@pair/db'
import { redis } from './redis'
import { logger } from './logger'

logger.info('Service starting...')

async function main() {
  await initDb()
  logger.info('Database initialized')

  const tradeRepository = AppDataSource.getRepository(Trade)

  async function finalizeTrades() {
    while (true) {
      try {
        // Get next partial trade from Redis queue
        const tradeId = await redis.rpop('partial_trades')

        if (!tradeId) {
          logger.info('No partial trades to finalize, waiting...')
          await new Promise((r) => setTimeout(r, 3000))
          continue
        }

        logger.info(`Finalizing trade ${tradeId}`)

        // Fetch trade from database
        const trade = await tradeRepository.findOne({ where: { id: tradeId } })

        if (!trade) {
          logger.warn(`Trade ${tradeId} not found in database`)
          continue
        }

        // Simulate final settlement and reconciliation
        logger.info(`Processing final settlement for trade ${tradeId}:`)
        logger.info(`  - Current state: ${trade.state}`)
        logger.info(`  - Execution result:`, { result: trade.result })

        // Simulate settlement delay
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000))

        // Update trade to completed state
        const finalResult = {
          ...trade.result,
          finalSettlement: {
            totalFilled: trade.result.filledAmount,
            remainingAmount: trade.size - trade.result.filledAmount,
            finalPrice: trade.result.avgPrice,
            pnl: (trade.result.avgPrice - trade.ratio_target) * trade.result.filledAmount,
            settlementTime: new Date().toISOString(),
          },
        }

        trade.state = 'done' as TradeState
        trade.result = finalResult
        await tradeRepository.save(trade)

        logger.info(`Trade ${tradeId} completed successfully:`, { finalSettlement: finalResult.finalSettlement })

        // Log trade summary
        logger.info(`Trade Summary ${tradeId}:`)
        logger.info(`  - Target Ratio: ${trade.ratio_target}`)
        logger.info(`  - Executed Ratio: ${finalResult.finalSettlement.finalPrice}`)
        logger.info(`  - P&L: ${finalResult.finalSettlement.pnl.toFixed(2)}`)
        logger.info(`  - Fill Rate: ${((finalResult.finalSettlement.totalFilled / trade.size) * 100).toFixed(1)}%`)
      } catch (error) {
        logger.error('Error in finalization loop:', { error })
        await new Promise((r) => setTimeout(r, 5000))
      }
    }
  }

  await finalizeTrades()
}

main().catch((error) => logger.error('Fatal error:', { error }))
