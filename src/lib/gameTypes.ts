export type Phase = 'betting' | 'flying' | 'crashed'

export type BetStatus = 'idle' | 'queued' | 'active' | 'cashed' | 'lost'

export interface BetState {
  status: BetStatus
  amount: number
  autoCashout: number | null
  cashoutAt: number | null
  profit: number
}

export interface HistoryItem {
  id: number
  crash: number
}
