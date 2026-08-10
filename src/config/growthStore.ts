/**
 * 倍率增长参数的运行时覆盖
 * 调参页改动后立即对游戏生效，并按浏览器本地存储保留。
 */
import { gameConfig } from './gameConfig'

export interface GrowthStage {
  /** 指数增长率 r（对「秒」） */
  rate: number
  /** 该阶段结束倍率；最后一档为 Infinity */
  until: number
}

const STORAGE_KEY = 'crash-growth-stages'
/** 升版本会忽略旧本地缓存，强制用新默认分段 */
const STORAGE_VERSION = 'v2-5stage'

export const DEFAULT_STAGES: GrowthStage[] = gameConfig.growth.stages.map(
  (s) => ({ rate: s.rate, until: s.until }),
)

const listeners = new Set<() => void>()
let stages: GrowthStage[] = load()
/** useSyncExternalStore 需要稳定引用 */
let snapshot: readonly GrowthStage[] = stages

function load(): GrowthStage[] {
  try {
    const version = localStorage.getItem(`${STORAGE_KEY}:ver`)
    if (version !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(`${STORAGE_KEY}:ver`, STORAGE_VERSION)
      return DEFAULT_STAGES.map((s) => ({ ...s }))
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STAGES.map((s) => ({ ...s }))
    const parsed = JSON.parse(raw) as { rate: number; until: number | null }[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_STAGES.map((s) => ({ ...s }))
    }
    return parsed.map((s) => ({
      rate: Number(s.rate),
      until: s.until == null ? Infinity : Number(s.until),
    }))
  } catch {
    return DEFAULT_STAGES.map((s) => ({ ...s }))
  }
}

function persist(next: GrowthStage[]) {
  try {
    // Infinity 无法 JSON 序列化，落盘时写成 null
    const plain = next.map((s) => ({
      rate: s.rate,
      until: Number.isFinite(s.until) ? s.until : null,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plain))
    localStorage.setItem(`${STORAGE_KEY}:ver`, STORAGE_VERSION)
  } catch {
    // 隐私模式等场景忽略持久化失败
  }
}

export function getGrowthStages(): readonly GrowthStage[] {
  return snapshot
}

export function setGrowthStages(next: GrowthStage[]) {
  stages = next.map((s) => ({ ...s }))
  snapshot = stages
  persist(stages)
  for (const fn of listeners) fn()
}

export function resetGrowthStages() {
  setGrowthStages(DEFAULT_STAGES.map((s) => ({ ...s })))
}

export function subscribeGrowth(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
