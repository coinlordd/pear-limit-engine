import { BaseClient } from './base'
import { Channel } from './types'
import type { OrderValue, RatioValue, TickValue } from '@pear/shared'

export class RedisClient extends BaseClient {
  constructor(url: string, system_prefix: string) {
    super(url, system_prefix)
  }

  private generateKey(channel: Channel, pairId: string) {
    return `${channel}:${pairId}`
  }

  /* --------- TICK DATA --------- */

  public async setTickData(value: TickValue): Promise<void> {
    const key = this.generateKey('tick', value.assetId)
    await this.set(key, value)
  }

  public async getTickData(assetId: string): Promise<TickValue | null> {
    const key = this.generateKey('tick', assetId)
    return await this.get<TickValue>(key)
  }

  /* --------- RATIOS --------- */

  public async setPearRatio(value: RatioValue): Promise<void> {
    const key = this.generateKey('ratio', value.pairId)
    await this.set(key, value)
  }

  public async getPearRatio(pairId: string): Promise<RatioValue | null> {
    const key = this.generateKey('ratio', pairId)
    return await this.get<RatioValue>(key)
  }

  /* --------- ORDERS --------- */

  /**
   * Adds a limit order to Redis using a hybrid model:
   *  - ZSET for price/ratio indexing (sorted lookup)
   *  - HSET (hash) for storing full order details
   *
   * Both the sorted set and hash are namespaced per pair.
   */
  public async addLimitOrder(order: OrderValue): Promise<void> {
    const setKey = this.generateKey(order.trigger === 'below' ? 'orders:below' : 'orders:above', order.pairId)
    const hashKey = this.generateKey('orders:data', order.pairId)

    // Index order in the sorted set
    await this.zadd(setKey, order.ratio, order.id)

    // Store the order details in the hash (field = order.id)
    await this.hset(hashKey, order.id, order)
  }

  /**
   * Returns all order IDs that should trigger for the given ratio, combining "below" and "above" sets.
   *
   * For "below": triggers if currentRatio < stored ratio (score > currentRatio)
   * For "above": triggers if currentRatio > stored ratio (score < currentRatio)
   */
  public async listLimitOrderIdsByRatio(pairId: string, currentRatio: number): Promise<string[]> {
    const keyBelow = this.generateKey('orders:below', pairId)
    const keyAbove = this.generateKey('orders:above', pairId)

    // For "below": stored ratio > currentRatio (score > currentRatio)
    // For "above": stored ratio < currentRatio (score < currentRatio)
    const [belowIds, aboveIds] = await Promise.all([
      this.zrangebyscore(keyBelow, `(${currentRatio}`, '+inf'),
      this.zrangebyscore(keyAbove, '-inf', `(${currentRatio}`),
    ])

    return [...belowIds, ...aboveIds]
  }

  /**
   * Returns all orders values that should trigger for the given ratio, combining "below" and "above" sets.
   */
  public async listLimitOrderValuesByRatio(pairId: string, currentRatio: number): Promise<OrderValue[]> {
    const ids = await this.listLimitOrderIdsByRatio(pairId, currentRatio)
    if (ids.length === 0) return []

    // Return the order details
    const hashKey = this.generateKey('orders:data', pairId)
    const orders = await this.hgetMany<OrderValue>(hashKey, ids)
    return orders.filter((x): x is OrderValue => x !== null)
  }

  /**
   * Returns all limit order IDs for a given pair, both "above" and "below" ratios.
   */
  public async listLimitOrderIds(pairId: string): Promise<string[]> {
    const keyBelow = this.generateKey('orders:below', pairId)
    const keyAbove = this.generateKey('orders:above', pairId)

    // Get all order IDs
    const [belowIds, aboveIds] = await Promise.all([this.zrange(keyBelow, 0, -1), this.zrange(keyAbove, 0, -1)])
    return [...belowIds, ...aboveIds]
  }

  /**
   * Returns all limit order values for a given pair, both "above" and "below" ratios.
   */
  public async listLimitOrderValues(pairId: string): Promise<OrderValue[]> {
    const ids = await this.listLimitOrderIds(pairId)
    if (ids.length === 0) return []

    // Return the order details
    const hashKey = this.generateKey('orders:data', pairId)
    const orders = await this.hgetMany<OrderValue>(hashKey, ids)
    return orders.filter((x): x is OrderValue => x !== null)
  }

  /**
   * Returns the lowest or highest limit orders for a given pair, based on ratio.
   *
   * @param pairId - The pair identifier.
   * @param direction - 'lowest' to get orders with lowest ratios, 'highest' for highest ratios.
   * @param limit - Number of orders to return.
   *
   * @returns An array of OrderValue objects matching the criteria.
   */
  public async getLimitOrders(pairId: string, direction: 'lowest' | 'highest', limit: number): Promise<OrderValue[]> {
    const keyBelow = this.generateKey('orders:below', pairId)
    const keyAbove = this.generateKey('orders:above', pairId)
    const hashKey = this.generateKey('orders:data', pairId)

    let ids: string[]
    if (direction === 'lowest') {
      ids = await this.zrange(keyBelow, 0, limit - 1)
    } else {
      ids = await this.zrevrange(keyAbove, 0, limit - 1)
    }

    if (ids.length === 0) return []

    const orders = await this.hgetMany<OrderValue>(hashKey, ids)
    return orders.filter((x): x is OrderValue => x !== null)
  }
}
