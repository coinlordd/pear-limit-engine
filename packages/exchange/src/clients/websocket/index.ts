import ReconnectingWebSocket from 'reconnecting-websocket'
import { Logger } from '@pear/logger'

import { Emitter, Listener } from './events'
import { MessageDispatch, Subscription, WSConfig, WSParams, WSState } from './types'

export { type MessageDispatch, type Subscription } from './types'

/**
  Core WebSocket client abstraction.

  Responsibilities:
  - Manage connection lifecycle & auto-reconnect
  - Route subscription messages and handlers
  - Buffer outbound messages when disconnected
  - Perform heartbeat & idle detection
*/
export abstract class AbstractWebSocketClient<TIncoming, TOutgoing, TSubPayload> {
  /** The configuration for the WebSocket client.*/
  protected config: Required<WSConfig>

  /** The logger instance to use.*/
  protected logger: Logger

  /** The WebSocket instance.*/
  protected ws!: ReconnectingWebSocket

  /** The emitter for the WebSocket client.*/
  protected emitter = new Emitter()

  /**
   * Map of subscriptionKey -> set of handlers.
   * A subscription may have multiple listeners.
   * Example: "l2Book:BTC" -> Set<callback>
   */
  private handlers = new Map<string, Set<Listener>>()

  /**
   * Registry of active subscriptions used for resubscribing after reconnect.
   * Does NOT store handlers, only payload definitions.
   */
  private subs = new Map<string, Subscription<any>>()

  /**
   * Queue of outbound messages when WebSocket not open.
   * Preserves order & prevents losing messages during reconnects.
   */
  private outbox: string[] = []

  /** The interval timer to flush the outbox progressively if configured.*/
  private flushTimer: ReturnType<typeof setInterval> | null = null

  /** The timestamp of the last message received.*/
  private lastMessageAt = 0

  /** The interval timer to send a heartbeat message.*/
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  /** The state of the WebSocket connection.*/
  private state: WSState = 'CLOSED'

  constructor(params: WSParams) {
    this.logger = params.logger
    this.config = {
      maxRetries: Infinity,
      minReconnectionDelay: 200,
      maxReconnectionDelay: 10_000,
      reconnectionDelayGrowFactor: 1.3,
      heartbeatIntervalMs: 15_000,
      idleTimeoutMs: 60_000,
      maxBufferedMessages: 1_000,
      flushIntervalMs: 0,
      ...params,
    } as Required<WSConfig>

    // Init socket
    this.initialize()
  }

  /*----------------------------------*/
  /* Abstract methods */
  /*----------------------------------*/

  protected abstract buildSubscriptionKey(payload: TSubPayload): string
  protected abstract deriveSubscriptionKey(data: TIncoming): string
  protected abstract buildSubscribeMessage(sub: Subscription<TSubPayload>): TOutgoing
  protected abstract buildUnsubscribeMessage(sub: Subscription<TSubPayload>): TOutgoing
  protected abstract parseIncoming(raw: any): MessageDispatch<TIncoming>[]

  /*----------------------------------*/
  /* Public API */
  /*----------------------------------*/

  /** Register a listener for a specific event.*/
  on(event: 'open' | 'close' | 'error' | 'message' | 'pong' | 'health', fn: Listener) {
    return this.emitter.on(event, fn)
  }

  /**
   * Subscribe to a specific stream by providing a payload.
   * @param payload - The payload of the subscription.
   * @param handler - The handler to call when the subscription receives a message.
   */
  subscribe(payload: TSubPayload, handler: Listener<TIncoming>) {
    // Create subscription object
    const key = this.buildSubscriptionKey(payload)
    const sub: Subscription<TSubPayload> = { key, payload }

    // Register handler if not already registered
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set())
    }

    // Add handler for this subscription key
    this.handlers.get(key)!.add(handler)

    // Track subscription for automatic resubscribe on reconnect
    this.subs.set(key, sub)

    // Build the subscribe message
    const subscribeMessage = this.buildSubscribeMessage(sub)

    // Send subscribe message
    this.sendOrQueue(subscribeMessage)

    return () => this.unsubscribe(sub.key, handler)
  }

  /**
   * Unsubscribe from a specific stream by providing a key.
   * @param key - The key of the subscription to unsubscribe from.
   * @param handler - The handler to remove from the subscription.
   *
   * If no handler is provided, the subscription will be removed.
   */
  unsubscribe(key: string, handler?: Listener) {
    // Get the list of handlers for the subscription
    const list = this.handlers.get(key)

    if (list) {
      // Remove the handler from the list
      if (handler) list.delete(handler)
      // If no handler is provided, or the list is empty, delete the subscription
      if (!handler || list.size === 0) this.handlers.delete(key)
    }

    if (!this.handlers.has(key)) {
      // Get the pending subscription
      const sub = this.subs.get(key)

      if (sub) {
        // Build the unsubscribe message
        const unsubscribeMessage = this.buildUnsubscribeMessage(sub)

        // Send the unsubscribe message
        this.sendOrQueue(unsubscribeMessage)

        // Remove the pending subscription
        this.subs.delete(key)
      }
    }
  }

  /**
   * Close the WebSocket connection.
   */
  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = null
    this.ws?.close()
    this.state = 'CLOSED'
  }

  /**
   * Send a message to the WebSocket.
   * @param obj - The message to send.
   *
   * If the WebSocket is not open, the message is queued and flushed periodically.
   * If the WebSocket is open, the message is sent immediately.
   * If the outbox exceeds the configured capacity, the oldest message is dropped.
   */
  private sendOrQueue(obj: TOutgoing) {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj)

    // Send the message immediately if the WebSocket is OPEN
    if (this.ws && this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(json)
      return
    }

    // Drop oldest message if outbox exceeds configured capacity
    if (this.outbox.length >= this.config.maxBufferedMessages) {
      this.logger.warn(`Outbox overflow; dropping oldest`, { size: this.outbox.length })
      this.outbox.shift()
    }

    // Queue the message
    this.outbox.push(json)

    // Start the flush timer if configured
    if (this.config.flushIntervalMs > 0 && !this.flushTimer) {
      this.flushTimer = setInterval(() => this.flushOutbox(), this.config.flushIntervalMs)
    }

    return () => {
      // Remove the message from the outbox
      this.outbox.splice(this.outbox.indexOf(json), 1)

      // Stop the flush timer if the outbox is empty
      if (this.outbox.length === 0 && this.flushTimer) {
        clearInterval(this.flushTimer)
        this.flushTimer = null
      }
    }
  }

  /**
   * Force-close socket (used for idle timeouts).
   * ReconnectingWebSocket will reopen automatically.
   */
  private reopen() {
    try {
      this.ws?.close()
    } catch {}
  }

  /**
   * Bootstraps socket connection + binds WS events.
   * Handles: onopen, onclose, onerror, onmessage.
   * Emits high-level events to user listeners.
   */
  private initialize() {
    const { url } = this.config

    this.ws = new ReconnectingWebSocket(url, [], {
      WebSocket: WebSocket,
      maxRetries: this.config.maxRetries,
      minReconnectionDelay: this.config.minReconnectionDelay,
      reconnectionDelayGrowFactor: this.config.reconnectionDelayGrowFactor,
      maxReconnectionDelay: this.config.maxReconnectionDelay,
      startClosed: false,
    })

    this.state = 'CONNECTING'

    /**
     * Socket opened:
     * - Mark OPEN
     * - Emit user 'open' event
     * - Flush queued outbound messages
     * - Resubscribe active subscriptions
     * - Start heartbeat timer
     */
    this.ws.onopen = () => {
      this.state = 'OPEN'
      this.logger.info('WS open', { url })
      this.emitter.emit('open', {})

      this.flushOutbox()
      this.resubscribeAll()
      this.startHeartbeat()
    }

    /**
     * Socket closed:
     * - Mark CLOSED
     * - Emit user 'close' event
     * - Stop heartbeat timer
     */
    this.ws.onclose = (ev: any) => {
      this.state = 'CLOSED'
      this.logger.warn('WS close', { code: ev?.code, reason: ev?.reason })
      this.emitter.emit('close', ev)
      this.stopHeartbeat()
    }

    /**
     * Socket error:
     * - Emit user 'error' event
     */
    this.ws.onerror = (err: any) => {
      this.logger.error('WS error', err)
      this.emitter.emit('error', err)
    }

    /**
     * Socket message:
     * - Update last message timestamp
     * - Parse JSON if necessary
     * - Emit raw message to global listeners
     * - Dispatch parsed messages to handlers mapped by subscription key
     */
    this.ws.onmessage = (ev: MessageEvent) => {
      // Update last message timestamp
      this.lastMessageAt = Date.now()

      // Parse JSON if necessary
      let raw: any = ev.data
      try {
        raw = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        this.logger.error('Failed to parse JSON', ev.data)
      }

      // Emit raw message to global listeners
      this.emitter.emit('message', raw)

      // Subclass parsing/routing
      try {
        const dispatches = this.parseIncoming(raw) || []

        // Dispatch parsed messages to handlers mapped by subscription key
        for (const d of dispatches) this.dispatchToHandlers(d)
      } catch (e) {
        this.logger.error('parseIncoming failed', e)
      }
    }
  }

  /**
   * Send queued messages once socket is OPEN.
   * Clears interval if queue becomes empty.
   */
  private flushOutbox() {
    // If the outbox is empty, return
    if (!this.outbox.length) return

    // If the socket is not OPEN, return
    if (this.ws.readyState !== 1 /* OPEN */) return

    // Drain outbox messages sequentially once socket is OPEN
    while (this.outbox.length) {
      this.ws.send(this.outbox.shift()!)
    }

    // Clear the flush timer if it exists
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Replay pending subscriptions after reconnect.
   */
  private resubscribeAll() {
    for (const sub of this.subs.values()) {
      const subscribeMessage = this.buildSubscribeMessage(sub)
      this.sendOrQueue(subscribeMessage)
    }
  }

  /**
   * Call all handlers subscribed to a dispatched key.
   * Try/catch individual handlers so one failure doesn't kill stream.
   */
  private dispatchToHandlers(d: MessageDispatch) {
    // Get the set of handlers for the dispatch key
    const set = this.handlers.get(d.key)
    if (!set || set.size === 0) return

    // Execute user handlers, catch errors so one bad handler doesn't break flow
    set.forEach((fn) => {
      try {
        fn(d.data)
      } catch (e) {
        this.logger.error('handler error', e)
      }
    })
  }

  /**
   * Heartbeat: monitors idle time.
   * If too long without message -> force reopen to recover stale WS.
   */
  private startHeartbeat() {
    // Stop the heartbeat timer if it exists
    this.stopHeartbeat()

    // Create a function to try to ping the server
    const tryPing = () => {
      const now = Date.now()

      // Detect stale connections by checking time since last message
      if (now - this.lastMessageAt > this.config.idleTimeoutMs) {
        this.logger.warn('Idle timeout; reopening')
        this.reopen()
        return
      }

      // Emit the health event
      this.emitter.emit('health', { lastMsgMsAgo: now - this.lastMessageAt })
    }

    // Start the heartbeat timer
    this.heartbeatTimer = setInterval(tryPing, this.config.heartbeatIntervalMs)
  }

  /**
   * Stop heartbeat timer (called on WS close).
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }
}
