import { describe, it, expect } from 'bun:test'
import { Book, HyperliquidClient } from '../src'

const client = new HyperliquidClient()

describe('Hyperliquid WS L2', () => {
  it('subscribes to the BTC orderbook', async () => {
    const data = await new Promise<Book>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('timeout waiting for data'))
        client.close()
      }, 5000)

      client.on('open', () => {
        client.book('BTC', (book) => {
          clearTimeout(timeout)
          resolve(book)
          client.close()
        })
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
        client.close()
      })
    })

    // Basic assertions
    expect(data.symbol).toBe('BTC')
    expect(Array.isArray(data.bids)).toBe(true)
    expect(Array.isArray(data.asks)).toBe(true)
    expect(data.bids.length).toBeGreaterThan(0)
    expect(data.asks.length).toBeGreaterThan(0)
  })

  it('subscribes to an unknown symbol', () => {
    expect(
      new Promise<Book>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('timeout'))
          client.close()
        }, 2000)

        client.on('open', () => {
          client.book('UNKNOWN', (book) => {
            resolve(book)
            clearTimeout(timeout)
          })
        })

        client.on('error', (err) => {
          clearTimeout(timeout)
          reject(err)
          client.close()
        })
      })
    ).rejects.toThrow()
  })
})
