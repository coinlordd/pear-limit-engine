import { RatioValue } from '@pear/shared'
import { logger, redis } from './services'

class _OrderMatcher {
  private latestRatioMap = new Map<string, RatioValue>()
  private processingMap = new Map<string, boolean>()

  /**
   * Called whenever a new tick (ratio update) is received.
   * Always stores the latest ratio for the given pair.
   * If no processing is currently running for that pair,
   * it starts a new processing loop.
   */
  public async onMessage(ratio: RatioValue): Promise<void> {
    this.latestRatioMap.set(ratio.pairId, ratio)

    // Start processing if not already running
    if (!this.processingMap.get(ratio.pairId)) {
      this.processingMap.set(ratio.pairId, true)
      void this.processNext(ratio.pairId)
    }
  }

  /**
   * Core matching logic
   * TODO: Implement
   */
  private async matchOrders(ratio: RatioValue): Promise<void> {
    const orders = await redis.listLimitOrderValuesByRatio(ratio.pairId, ratio.ratio)
    logger.info(`[matcher] Matched ${orders.length} orders for ${ratio.pairId} @ ${ratio.ratio}`)
  }

  /**
   * Processes the most recent ratio for a pair.
   * After finishing, it checks whether a newer ratio arrived
   * during the current processing and runs again if needed.
   */
  private async processNext(id: string): Promise<void> {
    const ratio = this.latestRatioMap.get(id)
    if (!ratio) {
      this.processingMap.set(id, false)
      return
    }

    try {
      await this.matchOrders(ratio)
    } catch (err) {
      logger.error(`[matcher] Error processing ${id}:`, err)
    }

    // Check if a newer ratio arrived while we were processing
    const latestAfter = this.latestRatioMap.get(id)

    if (latestAfter && latestAfter.timestamp !== ratio.timestamp) {
      // A newer tick exists, immediately process again
      await this.processNext(id)
    } else {
      // No newer tick, mark as idle
      this.processingMap.set(id, false)
    }
  }
}

export const OrderMatcher = new _OrderMatcher()
