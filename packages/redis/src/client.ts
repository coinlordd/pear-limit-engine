import { BaseClient } from './base'
import { Channel } from './types'
import type { RatioValue } from '@pair/shared'

export class RedisClient extends BaseClient {
  constructor(url: string, system_prefix: string) {
    super(url, system_prefix)
  }

  private generateKey(channel: Channel, key: string) {
    return `${channel}:${key}`
  }

  /* --------- RATIOS --------- */

  public async setPearRatio(value: RatioValue): Promise<void> {
    const key = this.generateKey('ratio', value.id)
    await this.set(key, value)
  }

  public async getPearRatio(id: string): Promise<RatioValue | null> {
    const key = this.generateKey('ratio', id)
    return await this.get<RatioValue>(key)
  }
}
