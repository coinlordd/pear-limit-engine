import { Book, BookLevel } from '../../types'
import { OrderbookResponse } from './types/incoming'

/**
 * Convert Hyperliquid's order book level to standardized format
 */
function mapBookLevel(level: { px: string; sz: string }): BookLevel {
  return {
    price: parseFloat(level.px),
    size: parseFloat(level.sz),
  }
}

/**
 * Map Hyperliquid's L2Book response to standardized Book format
 */
export function mapL2BookToBook(response: OrderbookResponse): Book {
  const [bids, asks] = response.levels

  return {
    symbol: response.coin,
    bids: bids.map(mapBookLevel),
    asks: asks.map(mapBookLevel),
    timestamp: response.time,
  }
}
