/**
 * Standardized order book level
 */
export interface BookLevel {
  price: number
  size: number
}

/**
 * Standardized order book
 */
export interface Book {
  symbol: string
  bids: BookLevel[]
  asks: BookLevel[]
  timestamp: number
}

/**
 * Generic exchange client interface
 * All exchange clients should implement this interface to provide standardized access
 */
export interface ExchangeClient {
  /**
   * Subscribe to order book updates for a given symbol
   * @param symbol The trading pair symbol (e.g., "BTC", "ETH")
   * @param handler Callback function that receives standardized book updates
   * @returns Unsubscribe function
   */
  book(symbol: string, handler: (book: Book) => void): () => void
}
