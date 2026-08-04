import { useEffect, useMemo, useState } from 'react'
import { gameConfig } from '../config/gameConfig'
import { colorForCrash, type HistoryColor } from '../data/prototypeHistory'
import type { BetState, Phase } from '../lib/gameTypes'

export type RowStatus = 'betting' | 'active' | 'cashed' | 'lost'

export interface LobbyRow {
  key: string
  name: string
  avatarHue: number
  isPlayer: boolean
  betAmount: number
  status: RowStatus
  mult: number | null
  multTone: HistoryColor | null
  winCoins: number | null
  /** 下注阶段展示文案 */
  waitLabel?: '等待中' | '已确认'
}

const BOT_NAMES = [
  'DolcePower',
  'CrashKing',
  'LuckyDuck',
  'MoonRider',
  'Bot_Neo88',
  'Bot_Alpha7',
  'User6474578',
  'User2946795',
  'User8812041',
  'User1550392',
  'User2977977',
  'NovaSpin',
  'JetFuel',
  'CashWave',
  'PixelFox',
  'StormBee',
]

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickName(used: Set<string>) {
  for (let i = 0; i < BOT_NAMES.length; i++) {
    const n = BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]!
    if (!used.has(n)) {
      used.add(n)
      return n
    }
  }
  const fallback = `Bot_${randInt(1000, 9999)}`
  used.add(fallback)
  return fallback
}

interface BotSeed {
  key: string
  name: string
  avatarHue: number
  betAmount: number
  cashoutAt: number
  /** 本轮是否下注 */
  willBet: boolean
  /** 下注阶段确认延迟（秒） */
  confirmAt: number
}

function seedBots(
  listSize: number,
  betMin: number,
  betMax: number,
  skipRatio: number,
): BotSeed[] {
  const used = new Set<string>()
  const out: BotSeed[] = []
  for (let i = 0; i < listSize; i++) {
    const willBet = Math.random() >= skipRatio
    out.push({
      key: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: pickName(used),
      avatarHue: randInt(0, 359),
      betAmount: willBet ? randInt(betMin, betMax) : 0,
      cashoutAt: Math.max(1.05, Number(randFloat(1.05, 12).toFixed(2))),
      willBet,
      confirmAt: willBet ? randFloat(0.3, 4.5) : 99,
    })
  }
  return out
}

interface Props {
  phase: Phase
  multiplier: number
  crashPoint: number | null
  bet: BetState
  roundId: number
  countdown: number
}

export function useLobbyParticipants({
  phase,
  multiplier,
  crashPoint,
  bet,
  roundId,
  countdown,
}: Props) {
  const {
    countMin,
    countMax,
    refreshMsMin,
    refreshMsMax,
    deltaMin,
    deltaMax,
    listSize,
    betMin,
    betMax,
    skipRatio,
  } = gameConfig.participants

  const [totalCount, setTotalCount] = useState(() =>
    randInt(countMin, countMax),
  )
  const [countBump, setCountBump] = useState(false)
  const [bots, setBots] = useState(() =>
    seedBots(listSize, betMin, betMax, skipRatio),
  )
  const [extraAvgBet, setExtraAvgBet] = useState(() =>
    randInt(betMin, betMax),
  )

  // 人数：每隔 5~10s 在 [-10,10] 抖动；增加时触发图标抖动
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const wait = randInt(refreshMsMin, refreshMsMax)
      timer = window.setTimeout(() => {
        setTotalCount((c) => {
          const next = Math.min(
            countMax,
            Math.max(countMin, c + randInt(deltaMin, deltaMax)),
          )
          if (next > c) {
            setCountBump(true)
            window.setTimeout(() => setCountBump(false), 420)
          }
          return next
        })
        setExtraAvgBet(randInt(betMin, betMax))
        schedule()
      }, wait)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [
    countMin,
    countMax,
    refreshMsMin,
    refreshMsMax,
    deltaMin,
    deltaMax,
    betMin,
    betMax,
  ])

  useEffect(() => {
    setBots(seedBots(listSize, betMin, betMax, skipRatio))
  }, [roundId, listSize, betMin, betMax, skipRatio])

  const bettingElapsed = Math.max(0, 5 - countdown)

  const rows: LobbyRow[] = useMemo(() => {
    const botRows: LobbyRow[] = bots.map((b) => {
      if (phase === 'betting') {
        if (!b.willBet) {
          return {
            key: b.key,
            name: b.name,
            avatarHue: b.avatarHue,
            isPlayer: false,
            betAmount: 0,
            status: 'betting',
            mult: null,
            multTone: null,
            winCoins: null,
            waitLabel: '等待中',
          }
        }
        const confirmed = bettingElapsed >= b.confirmAt
        return {
          key: b.key,
          name: b.name,
          avatarHue: b.avatarHue,
          isPlayer: false,
          betAmount: confirmed ? b.betAmount : 0,
          status: 'betting',
          mult: null,
          multTone: null,
          winCoins: null,
          waitLabel: confirmed ? '已确认' : '等待中',
        }
      }

      if (!b.willBet) {
        return {
          key: b.key,
          name: b.name,
          avatarHue: b.avatarHue,
          isPlayer: false,
          betAmount: 0,
          status: 'lost',
          mult: null,
          multTone: null,
          winCoins: null,
        }
      }

      if (phase === 'flying') {
        if (multiplier >= b.cashoutAt) {
          return {
            key: b.key,
            name: b.name,
            avatarHue: b.avatarHue,
            isPlayer: false,
            betAmount: b.betAmount,
            status: 'cashed',
            mult: b.cashoutAt,
            multTone: colorForCrash(b.cashoutAt),
            winCoins: b.betAmount * b.cashoutAt,
          }
        }
        return {
          key: b.key,
          name: b.name,
          avatarHue: b.avatarHue,
          isPlayer: false,
          betAmount: b.betAmount,
          status: 'active',
          mult: null,
          multTone: null,
          winCoins: null,
        }
      }

      if (crashPoint != null && b.cashoutAt <= crashPoint) {
        return {
          key: b.key,
          name: b.name,
          avatarHue: b.avatarHue,
          isPlayer: false,
          betAmount: b.betAmount,
          status: 'cashed',
          mult: b.cashoutAt,
          multTone: colorForCrash(b.cashoutAt),
          winCoins: b.betAmount * b.cashoutAt,
        }
      }
      const loseMult = crashPoint ?? multiplier
      return {
        key: b.key,
        name: b.name,
        avatarHue: b.avatarHue,
        isPlayer: false,
        betAmount: b.betAmount,
        status: 'lost',
        mult: loseMult,
        multTone: colorForCrash(loseMult),
        winCoins: null,
      }
    })

    let playerRow: LobbyRow
    if (bet.status === 'queued') {
      playerRow = {
        key: 'player',
        name: '我',
        avatarHue: 140,
        isPlayer: true,
        betAmount: bet.amount,
        status: 'betting',
        mult: null,
        multTone: null,
        winCoins: null,
        waitLabel: '已确认',
      }
    } else if (bet.status === 'active') {
      playerRow = {
        key: 'player',
        name: '我',
        avatarHue: 140,
        isPlayer: true,
        betAmount: bet.amount,
        status: 'active',
        mult: null,
        multTone: null,
        winCoins: null,
      }
    } else if (bet.status === 'cashed') {
      const m = bet.cashoutAt ?? 1
      playerRow = {
        key: 'player',
        name: '我',
        avatarHue: 140,
        isPlayer: true,
        betAmount: bet.amount,
        status: 'cashed',
        mult: m,
        multTone: colorForCrash(m),
        winCoins: bet.amount * m,
      }
    } else if (bet.status === 'lost') {
      const m = crashPoint ?? multiplier
      playerRow = {
        key: 'player',
        name: '我',
        avatarHue: 140,
        isPlayer: true,
        betAmount: bet.amount,
        status: 'lost',
        mult: m,
        multTone: colorForCrash(m),
        winCoins: null,
      }
    } else {
      // 未下注：始终置顶显示
      playerRow = {
        key: 'player',
        name: '我',
        avatarHue: 140,
        isPlayer: true,
        betAmount: 0,
        status: 'betting',
        mult: null,
        multTone: null,
        winCoins: null,
        waitLabel: '等待中',
      }
    }

    // 玩家永远置顶；其余机器人按状态排序
    const sortedBots = [...botRows].sort((a, b) => {
      const rank = (s: RowStatus) =>
        s === 'cashed' ? 0 : s === 'active' || s === 'betting' ? 1 : 2
      const dr = rank(a.status) - rank(b.status)
      if (dr !== 0) return dr
      return (b.winCoins ?? 0) - (a.winCoins ?? 0)
    })
    return [playerRow, ...sortedBots]
  }, [bots, phase, multiplier, crashPoint, bet, bettingElapsed])

  const listStake = rows.reduce((s, r) => s + r.betAmount, 0)
  const hiddenCount = Math.max(0, totalCount - rows.length)
  const totalFunds = listStake + hiddenCount * extraAvgBet
  const displayCount = Math.max(totalCount, rows.length)

  return {
    totalCount: displayCount,
    totalFunds,
    rows,
    countBump,
  }
}
