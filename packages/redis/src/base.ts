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
    return `${this.system_prefix}:${key}`
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

  protected async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.injectSystemPrefix(key))
    if (value === null) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  protected async set<T>(key: string, value: T): Promise<void> {
    const data = typeof value === 'object' ? JSON.stringify(value) : String(value)
    await this.client.set(this.injectSystemPrefix(key), data)
  }
}
