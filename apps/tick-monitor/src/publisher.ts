import { RatioValue } from '@pair/shared'
import { redis } from './redis'

class _TickPublisher {
  private readonly lastPublishedRatioMap: Map<string, RatioValue> = new Map()
  private readonly LAST_PUBLISHED_INTERVAL_MS = 100
  private readonly LAST_PUBLISHED_DELTA = 0.001

  public async publishPearRatio(value: RatioValue): Promise<void> {
    // Check if we should publish the ratio
    if (!this.shouldPublishPearRatio(value)) return

    // Publish the ratio
    await redis.publish('ratio', value)

    // Update the last published ratio map
    this.lastPublishedRatioMap.set(value.id, value)
  }

  public shouldPublishPearRatio(value: RatioValue): boolean {
    // Get the last published ratio for this pear
    const current = this.lastPublishedRatioMap.get(value.id)

    // If no previous ratio, we should publish
    if (!current) return true

    // Check if the interval has passed
    const timeSinceLastPublish = value.ts - current.ts
    const hasPassedInterval = timeSinceLastPublish >= this.LAST_PUBLISHED_INTERVAL_MS

    // Check if the delta has passed
    const hasPassedDelta = Math.abs(value.ratio - current.ratio) >= this.LAST_PUBLISHED_DELTA

    return hasPassedInterval || hasPassedDelta
  }
}

export const TickPublisher = new _TickPublisher()
