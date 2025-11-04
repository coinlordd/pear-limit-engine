import { describe, it, expect } from 'bun:test'
import { HyperliquidClient } from '../src'
import { IncomingMessage } from '../src/clients/hyperliquid/types'

const client = new HyperliquidClient()

describe('Hyperliquid WS L2', () => {
  it('subscribes to the BTC orderbook', async () => {
    const data = await new Promise<IncomingMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('timeout waiting for data'))
        client.close()
      }, 5000)

      client.on('open', () => {
        client.subscribe({ type: 'l2Book', coin: 'BTC' }, (data) => {
          resolve(data)
        })
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
        client.close()
      })
    })

    // Basic assertions
    expect(data.channel).toBe('l2Book')
    expect(data.data.coin).toBe('BTC')
    expect(Array.isArray(data.data.levels[0])).toBe(true)
    expect(Array.isArray(data.data.levels[1])).toBe(true)
    expect(data.data.levels[0].length).toBeGreaterThan(0)
    expect(data.data.levels[1].length).toBeGreaterThan(0)
  })
})
