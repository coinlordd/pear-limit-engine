export type TradeState = 'pending' | 'executing' | 'partial' | 'done' | 'failed'

export interface Trade {
  id: string
  state: TradeState
  ratio_target: number
  ratio_last?: number | null
  size: number
  result?: any
  updated_at?: Date
}

// TODO: compress keys to single character ids to reduce storage size.

export interface OrderValue {
  /* Order ID */
  id: string
  /* Pair ID */
  pairId: string
  /* Ratio at which the order should trigger */
  ratio: number
  /* Trigger type */
  trigger: 'above' | 'below'
}

export interface RatioValue {
  /* Pair ID */
  pairId: string
  /* Ratio of PA divided by PB */
  ratio: number
  /* Timestamp in milliseconds */
  timestamp: number
}

export interface TickValue {
  /* Asset ID*/
  assetId: string
  /* Price of asset */
  price: number
  /* Timestamp in milliseconds */
  timestamp: number
}
