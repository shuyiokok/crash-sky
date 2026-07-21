/** 原型稿历史倍率标签（色块按清单顺序） */
export type HistoryColor =
  | 'blue'
  | 'yellow'
  | 'red'
  | 'orange'
  | 'white'

export const PROTOTYPE_HISTORY: { value: number; color: HistoryColor }[] = [
  { value: 5.16, color: 'blue' },
  { value: 2.28, color: 'yellow' },
  { value: 170.8, color: 'red' },
  { value: 2.26, color: 'yellow' },
  { value: 1.91, color: 'blue' },
  { value: 4.55, color: 'orange' },
  { value: 1.26, color: 'blue' },
  { value: 1.21, color: 'blue' },
  { value: 51.55, color: 'red' },
  { value: 1.96, color: 'blue' },
  { value: 1.0, color: 'white' },
  { value: 1.38, color: 'blue' },
  { value: 2.19, color: 'yellow' },
  { value: 1.51, color: 'blue' },
]

/** PRD：&lt;10 白 / 10~20 蓝 / 21~50 橙 / ≥51 红 */
export function colorForCrash(crash: number): HistoryColor {
  if (crash < 10) return 'white'
  if (crash < 21) return 'blue'
  if (crash < 51) return 'orange'
  return 'red'
}
