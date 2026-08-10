import { gameConfig } from '../config/gameConfig'
import { getGrowthStages, type GrowthStage } from '../config/growthStore'

interface ResolvedStage {
  rate: number
  fromM: number
  untilM: number
  startT: number
}

export function resolveStages(
  stages: readonly GrowthStage[],
): ResolvedStage[] {
  const out: ResolvedStage[] = []
  let fromM = 1
  let startT = 0
  for (const stage of stages) {
    const untilM = stage.until
    out.push({ rate: stage.rate, fromM, untilM, startT })
    if (Number.isFinite(untilM) && untilM > fromM) {
      startT += Math.log(untilM / fromM) / stage.rate
      fromM = untilM
    }
  }
  return out
}

export function floor2(n: number, decimals = gameConfig.growth.decimals): number {
  const f = 10 ** decimals
  return Math.floor(n * f) / f
}

/** Display multiplier at elapsed time t (seconds). */
export function multiplierAt(
  t: number,
  stageList: readonly GrowthStage[] = getGrowthStages(),
): number {
  if (t <= 0) return 1
  const stages = resolveStages(stageList)
  let m = 1
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]!
    const next = stages[i + 1]
    const endT = next ? next.startT : Infinity
    if (t <= endT || i === stages.length - 1) {
      m = s.fromM * Math.exp(s.rate * (t - s.startT))
      break
    }
  }
  return Math.max(1, floor2(m))
}

/** Seconds needed to reach (or pass) target multiplier. */
export function timeToReach(
  target: number,
  stageList: readonly GrowthStage[] = getGrowthStages(),
): number {
  if (target <= 1) return 0
  const stages = resolveStages(stageList)
  for (const s of stages) {
    if (target <= s.untilM || !Number.isFinite(s.untilM)) {
      return s.startT + Math.log(target / s.fromM) / s.rate
    }
  }
  const last = stages[stages.length - 1]!
  return last.startT + Math.log(target / last.fromM) / last.rate
}

/**
 * 崩盘点：C = max(1, floor(rtp / U))，U∈(0,1)
 * 与 PRD 一致；动画只是表现层。
 */
export function generateCrashPoint(rtp = gameConfig.crash.rtp): number {
  const u = Math.max(1e-12, Math.random())
  return Math.max(1, floor2(rtp / u))
}

/** 崩盘点 ≥ target 的概率（rtp/U 分布） */
export function survivalProbability(
  target: number,
  rtp = gameConfig.crash.rtp,
): number {
  if (target <= 1) return 1
  return Math.min(1, rtp / target)
}

/** PRD 色阶：&lt;10 白 / 10~20 蓝 / 21~50 橙 / ≥51 红 */
export function historyTone(crash: number): 'low' | 'mid' | 'high' | 'moon' {
  if (crash < 10) return 'low'
  if (crash < 21) return 'mid'
  if (crash < 51) return 'high'
  return 'moon'
}
