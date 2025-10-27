import { BaseClient } from './base'
import { Channel } from './types'
import type { RatioValue } from '@pair/shared'

export class RedisClient extends BaseClient {
  private readonly lastPublishedRatio: Map<string, RatioValue> = new Map()
  private readonly LAST_PUBLISHED_INTERVAL_MS = 100
  private readonly LAST_PUBLISHED_DELTA = 0.005

  constructor(url: string, system_prefix: string) {
    super(url, system_prefix)
  }

  private generateKey(channel: Channel, key: string) {
    return `${channel}:${key}`
  }

  public async setPearRatio(value: RatioValue): Promise<void> {
    const key = this.generateKey('ratio', value.id)
    await this.set(key, value)
  }

  public async getPearRatio(id: string): Promise<RatioValue | null> {
    const key = this.generateKey('ratio', id)
    return await this.get<RatioValue>(key)
  }

  /**
   * Compute if the ratio has changed enough to be published. It either:
   * - passed the interval since last publish (default 100ms)
   * - passed the delta since last publish (default 0.005)
   */
  public shouldPublishPearRatio(value: RatioValue): boolean {
    const current = this.lastPublishedRatio.get(value.id)
    if (!current) return true

    const timeSinceLastPublish = value.ts - current.ts
    const hasPassedInterval = timeSinceLastPublish >= this.LAST_PUBLISHED_INTERVAL_MS
    const hasPassedDelta = Math.abs(value.ratio - current.ratio) >= this.LAST_PUBLISHED_DELTA

    return hasPassedInterval || hasPassedDelta
  }

  /**
   * Publish the ratio to our subscribers. If the ratio has not changed enough,
   * it will not be published. This is to avoid flooding our subscribers with updates.
   */
  public async publishPearRatio(value: RatioValue): Promise<void> {
    if (!this.shouldPublishPearRatio(value)) return

    await this.publish('ratio', value)
    this.lastPublishedRatio.set(value.id, value)
  }
}
