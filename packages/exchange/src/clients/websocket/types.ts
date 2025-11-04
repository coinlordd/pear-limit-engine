import { Logger } from '@pear/logger'

export type WSState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

export interface WSParams extends WSConfig {
  logger: Logger
}

export interface WSConfig {
  /** The URL to connect to. */
  url: string

  /** The maximum number of times to retry a connection. Default: Infinity.*/
  maxRetries?: number

  /** The minimum delay between reconnection attempts. Default: 200ms.*/
  minReconnectionDelay?: number

  /** The maximum delay between reconnection attempts. Default: 10_000ms.*/
  maxReconnectionDelay?: number

  /** The factor by which the reconnection delay grows. Default: 1.3.*/
  reconnectionDelayGrowFactor?: number // default 1.3

  /** The interval at which to send a ping or check for idleness. Default: 15_000ms.*/
  heartbeatIntervalMs?: number

  /** The timeout after which to force a reconnection if no messages have been received. Default: 60_000ms.*/
  idleTimeoutMs?: number

  /** The maximum number of messages to buffer in the outgoing queue. Default: 1_000.*/
  maxBufferedMessages?: number

  /** The interval at which to flush the outgoing queue. Default: 0 (immediate).*/
  flushIntervalMs?: number
}

export interface Subscription<TPayload = unknown> {
  key: string
  payload: TPayload
}

export type MessageDispatch<TMsg = unknown> = {
  /** The key of the dispatch.*/
  key: string

  /** The parsed payload for handlers.*/
  data: TMsg
}
