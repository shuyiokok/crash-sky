/**
 * 原型固定文案与配色数据（对齐 Figma/墨刀组件清单）
 * 规则：超高倍红 / 中倍黄 / 普通蓝 / 1.00x 白
 */

export type HistTone = 'blue' | 'yellow' | 'red' | 'orange' | 'white'

export interface HistPill {
  label: string
  tone: HistTone
}

/**
 * TopBar · 历史倍率标签
 * 配色顺序：蓝/黄/红/黄/蓝/橙/蓝/蓝/红/蓝/白/蓝/黄/蓝
 */
export const PROTO_HISTORY: HistPill[] = [
  { label: '5.16x', tone: 'blue' },
  { label: '2.28x', tone: 'yellow' },
  { label: '170.8x', tone: 'red' },
  { label: '2.26x', tone: 'yellow' },
  { label: '1.91x', tone: 'blue' },
  { label: '4.55x', tone: 'orange' },
  { label: '1.26x', tone: 'blue' },
  { label: '1.21x', tone: 'blue' },
  { label: '51.55x', tone: 'red' },
  { label: '1.96x', tone: 'blue' },
  { label: '1.00x', tone: 'white' },
  { label: '1.38x', tone: 'blue' },
  { label: '2.19x', tone: 'yellow' },
  { label: '1.51x', tone: 'blue' },
]

export interface ProtoPlayer {
  id: string
  /** 倍率文案；押注态为空并用 betLabel */
  mult: string | null
  /** 收益/筹码数字（绿色） */
  profit: string
  /** 第四行特殊：显示「押注」 */
  pending?: boolean
}

/** ChartMain · 右侧机器人列表（12 行，>10） */
export const PROTO_PLAYERS: ProtoPlayer[] = [
  { id: 'User6474578', mult: '12x', profit: '103.489489' },
  { id: 'DolcePower', mult: '1.32x', profit: '0.00816326' },
  { id: 'User2946795', mult: '2x', profit: '200.000000' },
  { id: 'Bot_Neo88', mult: '3.45x', profit: '34.500000' },
  { id: 'CrashKing', mult: '1.08x', profit: '0.800000' },
  { id: 'User8812041', mult: '5.20x', profit: '52.000000' },
  { id: 'LuckyDuck', mult: '1.66x', profit: '6.600000' },
  { id: 'Bot_Alpha7', mult: '8.11x', profit: '81.100000' },
  { id: 'User1550392', mult: '1.21x', profit: '2.100000' },
  { id: 'MoonRider', mult: '2.90x', profit: '29.000000' },
  { id: 'User2977977', mult: null, profit: '1000.000000', pending: true },
  { id: 'Bot_Waiter', mult: null, profit: '500.000000', pending: true },
]

export const PROTO_PLAYER_COUNT = 12
export const PROTO_TOTAL_CHIP = '$1.28'

export const PROTO_AUTO_DEFAULT = 5.1
export const PROTO_BET_DEFAULT = 10000

export const SUPPRESS_KEY = 'crash_suppress_popup_date'

export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
