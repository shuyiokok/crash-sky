/**
 * 冲上云霄 · 可调配置（首版本地结算）
 * 日常只改本文件；后续可从飞书配置表同步。
 */

export const gameConfig = {
  meta: {
    title: '冲上云霄',
    subtitle: '麻将局后 Crash 小游戏 · 免费筹码演示',
    rtpHint: '本地结算 · 非真实货币 · 可分享试玩',
  },

  /**
   * 倍率增长（分段指数）
   * M(t) 各阶段：e^{r·Δt}
   */
  growth: {
    decimals: 2,
    stages: [
      { rate: 0.11, until: 20 },
      { rate: 0.065, until: 100 },
      { rate: 0.04, until: Infinity },
    ],
  },

  round: {
    /** 下注倒计时（毫秒） */
    bettingMs: 5000,
    /** 坠毁后展示停留（毫秒） */
    crashHoldMs: 2800,
    maxChartPoints: 480,
    historyLimit: 24,
    /** 单次打开弹窗最多可玩局数 */
    sessionPlays: 10,
  },

  economy: {
    startingBalance: 5_000_000,
    /** 最低参与分（PRD 默认 10000） */
    minBet: 10_000,
    /** 硬上限 1 亿；实际 MAX = min(金币/5, hardMaxBet) */
    hardMaxBet: 100_000_000,
    defaultBet: 10_000,
    defaultAutoCashoutOn: false,
    defaultAutoCashoutAt: 5.1,
    /** 加减按钮步进 = 底分 */
    betStep: 10_000,
    autoStep: 0.1,
    /** MAX = floor(balance / maxBetDivisor) */
    maxBetDivisor: 5,
  },

  /**
   * 崩盘：C = max(1, floor(rtp / U))，U∈(0,1)
   * 预期单次返奖率 ≈ rtp
   */
  crash: {
    rtp: 0.98,
  },

  /**
   * 右侧氛围机器人（PRD：65~200，每隔 5~10s 变动 [-10,10]）
   */
  participants: {
    countMin: 65,
    countMax: 200,
    refreshMsMin: 5000,
    refreshMsMax: 10000,
    deltaMin: -10,
    deltaMax: 10,
    listSize: 12,
    betMin: 10_000,
    betMax: 500_000,
    /** 每轮不下注机器人比例 */
    skipRatio: 0.15,
  },

  /** 触发门控（演示页可跳过；正式接入麻将时启用） */
  gate: {
    minTotalGames: 5,
    everyNGames: 1,
    enabled: false,
  },
}

export type GameConfig = typeof gameConfig

/** 当前可下注上限：持有金币/5，且不超过 1 亿 */
export function computeMaxBet(balance: number): number {
  const { hardMaxBet, maxBetDivisor, minBet } = gameConfig.economy
  return Math.max(
    minBet,
    Math.min(hardMaxBet, Math.floor(balance / maxBetDivisor)),
  )
}

export function growthFormulaLabel(): string {
  const { stages } = gameConfig.growth
  const parts = stages.map((s, i) => {
    const r = s.rate
    if (i === 0) return `M(t)=e^{${r}t}`
    if (!Number.isFinite(s.until)) return `${stages[i - 1]!.until}x 后 r=${r}`
    return `${stages[i - 1]!.until}x→${s.until}x r=${r}`
  })
  return parts.join(' → ')
}
