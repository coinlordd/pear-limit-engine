import { createLogger } from '@pear/logger'

import { AbstractWebSocketClient, MessageDispatch, Subscription } from '../websocket'
import { Book, ExchangeClient } from '../../types'
import { mapL2BookToBook } from './mappings'
import {
  ChannelKey,
  ChannelKeySchema,
  IncomingMessage,
  OrderbookResponseSchema,
  OutgoingMessage,
  SubscriptionPayload,
  SubscriptionToMessageMap,
} from './types'

export class HyperliquidClient
  extends AbstractWebSocketClient<IncomingMessage, OutgoingMessage, SubscriptionPayload>
  implements ExchangeClient
{
  constructor() {
    super({
      url: 'wss://api.hyperliquid.xyz/ws',
      logger: createLogger('hyperliquid'),
    })
  }

  /**
   * Subscribe to order book updates for a given symbol using the standardized interface.
   * Internally uses the l2Book subscription and maps it to the standardized format.
   */
  book(symbol: string, handler: (book: Book) => void): () => void {
    return this.subscribe({ type: 'l2Book', coin: symbol }, (message) => {
      const standardizedBook = mapL2BookToBook(message.data)
      handler(standardizedBook)
    })
  }

  /**
   * Subscribe to a specific stream with type-safe callback inference.
   * The callback type is automatically inferred based on the subscription payload type.
   */
  override subscribe<TPayload extends SubscriptionPayload>(
    payload: TPayload,
    handler: (message: SubscriptionToMessageMap[TPayload['type']]) => void
  ) {
    return super.subscribe(payload, handler)
  }

  protected buildSubscriptionKey(payload: SubscriptionPayload): string {
    switch (payload.type) {
      case 'l2Book':
        return `l2Book:${payload.coin}`
    }
  }

  protected deriveSubscriptionKey(data: IncomingMessage): string {
    switch (data.channel) {
      case 'l2Book':
        return `l2Book:${data.data.coin}`
    }
  }

  protected parseIncoming(raw: unknown): MessageDispatch<IncomingMessage>[] {
    try {
      const out: MessageDispatch<IncomingMessage>[] = []

      // Hard safety guard
      if (!raw || typeof raw !== 'object') return out

      // Type narrowing: raw is now object
      const maybe = raw as any

      // Early return if the message is a subscription response
      if (maybe.channel === 'subscriptionResponse') return []

      // Early return if the message is an error
      if (maybe.channel === 'error') {
        if (maybe.data.includes('Already subscribed')) {
          return []
        } else {
          throw new Error(maybe.data)
        }
      }

      // Get the channel key
      const channelKey = ChannelKeySchema.safeParse(maybe.channel)
      if (!channelKey.success) throw new Error('Invalid channel key: ' + maybe)

      return this.parseIncomingData(channelKey.data, maybe.data)
    } catch (e) {
      this.logger.error('Invalid incoming message', e)
      return []
    }
  }

  private parseIncomingData(channelKey: ChannelKey, data: any): MessageDispatch<IncomingMessage>[] {
    switch (channelKey) {
      case 'l2Book':
        const parsed = OrderbookResponseSchema.parse(data)
        return [
          {
            key: this.deriveSubscriptionKey({ channel: 'l2Book', data: parsed }),
            data: { channel: 'l2Book', data: parsed },
          },
        ]
    }
  }

  protected buildSubscribeMessage(sub: Subscription<SubscriptionPayload>): OutgoingMessage {
    switch (sub.payload.type) {
      case 'l2Book':
        return {
          method: 'subscribe',
          subscription: {
            type: 'l2Book',
            coin: sub.payload.coin,
            nSigFigs: null,
            mantissa: null,
          },
        }
    }
  }

  protected buildUnsubscribeMessage(sub: Subscription<SubscriptionPayload>): OutgoingMessage {
    switch (sub.payload.type) {
      case 'l2Book':
        return {
          method: 'unsubscribe',
          subscription: {
            type: 'l2Book',
            coin: sub.payload.coin,
            nSigFigs: null,
            mantissa: null,
          },
        }
    }
  }
}
