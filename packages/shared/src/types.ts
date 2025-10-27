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

export interface RatioValue {
  /* ID of the pear */
  id: string
  /* Price of asset A */
  pa: number
  /* Price of asset B */
  pb: number
  /* Ratio of PA divided by PB */
  ratio: number
  /* Timestamp in milliseconds */
  ts: number
}
