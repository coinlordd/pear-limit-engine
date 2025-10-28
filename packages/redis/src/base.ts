import Redis from 'ioredis'
import { Channel, ChannelValue, SubscriberParams } from './types'

export abstract class BaseClient {
  private client: Redis
  private _publisher?: Redis
  private _subscriber?: Redis
  private readonly url: string
  private readonly system_prefix: string

  constructor(url: string, system_prefix: string) {
    this.client = new Redis(url)
    this.url = url
    this.system_prefix = system_prefix
  }

  private get publisher() {
    if (!this._publisher) this._publisher = new Redis(this.url)
    return this._publisher
  }

  private get subscriber() {
    if (!this._subscriber) this._subscriber = new Redis(this.url)
    return this._subscriber
  }

  private injectSystemPrefix(key: string) {
    return this.system_prefix ? `${this.system_prefix}:${key}` : key
  }

  public async subscribe<C extends Channel>(params: SubscriberParams<C>): Promise<void> {
    const sub = this.subscriber
    const channelKey = this.injectSystemPrefix(params.channel)
    await sub.subscribe(channelKey)

    sub.on('message', (ch, msg) => {
      if (ch === channelKey) {
        try {
          const parsed = JSON.parse(msg)
          params.handler(parsed as ChannelValue<C>)
        } catch {
          params.handler(msg as unknown as ChannelValue<C>)
        }
      }
    })
  }

  public async publish<C extends Channel>(channel: C, value: ChannelValue<C>): Promise<void> {
    const pub = this.publisher
    const channelKey = this.injectSystemPrefix(channel)
    const data = typeof value === 'string' ? value : JSON.stringify(value)
    await pub.publish(channelKey, data)
  }

  protected async set<T extends string | object>(key: string, value: T): Promise<void> {
    const data = typeof value === 'object' ? JSON.stringify(value) : String(value)
    await this.client.set(this.injectSystemPrefix(key), data)
  }

  protected async get<T extends string | object>(key: string): Promise<T | null> {
    const value = await this.client.get(this.injectSystemPrefix(key))
    if (value === null) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  protected async hset<T extends string | object>(key: string, field: string, value: T): Promise<void> {
    const data = typeof value === 'object' ? JSON.stringify(value) : String(value)
    await this.client.hset(this.injectSystemPrefix(key), field, data)
  }

  protected async hget<T extends string | object>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(this.injectSystemPrefix(key), field)
    if (value === null) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  protected async zadd(key: string, score: number, value: string): Promise<void> {
    await this.client.zadd(this.injectSystemPrefix(key), score, value)
  }

  protected async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrevrange(this.injectSystemPrefix(key), start, stop)
  }

  protected async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrange(this.injectSystemPrefix(key), start, stop)
  }

  protected async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    return await this.client.zrangebyscore(this.injectSystemPrefix(key), min, max)
  }

  /**
   * Type-safe method to get multiple hash fields using pipeline
   */
  protected async hgetMany<T extends string | object>(key: string, fields: string[]): Promise<(T | null)[]> {
    if (fields.length === 0) return []

    const pipeline = this.client.pipeline()
    fields.forEach((field) => pipeline.hget(this.injectSystemPrefix(key), field))
    const results = await pipeline.exec()

    if (!results) return []

    return results.map(([err, value]) => {
      if (err || value === null) return null
      try {
        return JSON.parse(value as string) as T
      } catch {
        return value as unknown as T
      }
    })
  }
}
