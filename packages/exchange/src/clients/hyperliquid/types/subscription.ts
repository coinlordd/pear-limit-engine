import { z } from 'zod'
import { IncomingMessage } from './incoming'

export const ChannelKeySchema = z.union([z.literal('l2Book')])
export type ChannelKey = z.infer<typeof ChannelKeySchema>

export type SubscriptionPayload = { type: 'l2Book'; coin: string }

export type SubscriptionToMessageMap = {
  l2Book: Extract<IncomingMessage, { channel: 'l2Book' }>
}
