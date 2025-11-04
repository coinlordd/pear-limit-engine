import { ChannelKey } from './subscription'

export interface OrderbookRequest {
  method: 'subscribe'
  subscription: {
    type: ChannelKey
    coin: string
    nSigFigs: number | null
    mantissa: number | null
  }
}

interface UnsubscribeRequest {
  method: 'unsubscribe'
  subscription: OrderbookRequest['subscription']
}

export type OutgoingMessage = OrderbookRequest | UnsubscribeRequest
