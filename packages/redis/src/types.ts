import { RatioValue } from '@pair/shared'

export interface ChannelRegistry {
  ratio: RatioValue
}

export type Channel = keyof ChannelRegistry
export type ChannelValue<C extends Channel> = ChannelRegistry[C]

export type SubscriberParams<C extends Channel> = {
  channel: C
  handler: (value: ChannelValue<C>) => void
}
