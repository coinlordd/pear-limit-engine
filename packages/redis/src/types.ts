import { RatioValue, OrderValue, TickValue } from '@pear/shared'

// prettier-ignore
export interface ChannelRegistry {
 /* --------- Market Data --------- */
 'ratio': RatioValue                // Latest ratio per pair (SET)
 'tick': TickValue                  // Raw tick data (Pub/Sub)

 /* ----------- Orders ------------*/
 'orders:below': string            // Limit orders below ratio (ZSET)
 'orders:above': string            // Limit orders above ratio (ZSET)
 'orders:data': OrderValue         // Full order objects (HSET)
}

export type Channel = keyof ChannelRegistry
export type ChannelValue<C extends Channel> = ChannelRegistry[C]

export type SubscriberParams<C extends Channel> = {
  channel: C
  handler: (value: ChannelValue<C>) => void
}
