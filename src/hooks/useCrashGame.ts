import { useCallback, useEffect, useRef, useState } from 'react'
import { computeMaxBet, gameConfig } from '../config/gameConfig'
import { generateCrashPoint, multiplierAt } from '../lib/multiplier'
import type { BetState, HistoryItem, Phase } from '../lib/gameTypes'

const idleBet = (): BetState => ({
  status: 'idle',
  amount: 0,
  autoCashout: null,
  cashoutAt: null,
  profit: 0,
})

/** 追加采样点：始终保留原点 (0,1)，保证拖尾从原点连到小球 */
function appendChartPoint(
  prev: { t: number; m: number }[],
  point: { t: number; m: number },
  maxPoints: number,
) {
  const origin = prev[0] ?? { t: 0, m: 1 }
  const next = [...prev, point]
  if (next.length <= maxPoints) return next
  // 保留首点 + 最近的尾部
  const keep = maxPoints - 1
  return [origin, ...next.slice(next.length - keep)]
}

export function useCrashGame() {
  const { bettingMs, crashHoldMs, maxChartPoints, historyLimit, sessionPlays } =
    gameConfig.round
  const { startingBalance, minBet } = gameConfig.economy

  const [phase, setPhase] = useState<Phase>('betting')
  const [multiplier, setMultiplier] = useState(1)
  const [countdown, setCountdown] = useState(bettingMs / 1000)
  const [crashPoint, setCrashPoint] = useState<number | null>(null)
  const [balance, setBalance] = useState(startingBalance)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [bet, setBet] = useState<BetState>(idleBet)
  const [points, setPoints] = useState<{ t: number; m: number }[]>([{ t: 0, m: 1 }])
  const [roundId, setRoundId] = useState(1)
  const [playsLeft, setPlaysLeft] = useState(sessionPlays)
  const [sessionEnded, setSessionEnded] = useState(false)

  const phaseRef = useRef<Phase>('betting')
  const betRef = useRef(bet)
  const balanceRef = useRef(startingBalance)
  const playsLeftRef = useRef(sessionPlays)
  const startRef = useRef(0)
  const betDeadlineRef = useRef(0)
  const rafRef = useRef(0)
  const historyIdRef = useRef(0)
  const crashAtRef = useRef<number | null>(null)
  const collectHistoryRef = useRef(true)
  const cashedRef = useRef(false)
  const finishCrashRef = useRef<(finalM: number) => void>(() => {})
  const tickBettingRef = useRef<() => void>(() => {})
  const pauseLoopRef = useRef(false)

  useEffect(() => {
    betRef.current = bet
  }, [bet])

  useEffect(() => {
    balanceRef.current = balance
  }, [balance])

  useEffect(() => {
    playsLeftRef.current = playsLeft
  }, [playsLeft])

  const cashOut = useCallback((at: number) => {
    const current = betRef.current
    if (current.status !== 'active' || cashedRef.current) return
    cashedRef.current = true
    const payout = current.amount * at
    const profit = payout - current.amount
    balanceRef.current += payout
    setBalance(balanceRef.current)
    setBet({
      ...current,
      status: 'cashed',
      cashoutAt: at,
      profit,
    })
  }, [])

  const placeBet = useCallback(
    (amount: number, autoCashout: number | null) => {
      if (pauseLoopRef.current) return false
      const phase = phaseRef.current
      const status = betRef.current.status
      const canNow = phase === 'betting' && status !== 'queued'
      const canNext =
        (phase === 'flying' || phase === 'crashed') && status === 'idle'
      if (!canNow && !canNext) return false

      const maxBet = computeMaxBet(balanceRef.current)
      const clipped = Math.min(
        maxBet,
        Math.max(minBet, Math.floor(amount)),
      )
      if (balanceRef.current < clipped) return false
      balanceRef.current -= clipped
      setBalance(balanceRef.current)
      setBet({
        status: 'queued',
        amount: clipped,
        autoCashout:
          autoCashout && autoCashout >= 1.01
            ? Math.floor(autoCashout * 100) / 100
            : null,
        cashoutAt: null,
        profit: 0,
      })
      return true
    },
    [minBet],
  )

  const cancelBet = useCallback(() => {
    const current = betRef.current
    if (current.status !== 'queued') return
    balanceRef.current += current.amount
    setBalance(balanceRef.current)
    setBet(idleBet())
  }, [])

  const resetSession = useCallback(() => {
    playsLeftRef.current = sessionPlays
    setPlaysLeft(sessionPlays)
    setSessionEnded(false)
    pauseLoopRef.current = false
    setHistory([])
    setBet(idleBet())
    cashedRef.current = false
    setPoints([{ t: 0, m: 1 }])
    setMultiplier(1)
    setCrashPoint(null)
    phaseRef.current = 'betting'
    setPhase('betting')
    setRoundId((r) => r + 1)
    betDeadlineRef.current = performance.now() + bettingMs
    tickBettingRef.current()
  }, [sessionPlays, bettingMs])

  useEffect(() => {
    let alive = true
    const { rtp } = gameConfig.crash

    const finishCrash = (finalM: number) => {
      if (phaseRef.current === 'crashed') return
      phaseRef.current = 'crashed'
      setPhase('crashed')
      setMultiplier(finalM)
      setCrashPoint(finalM)
      crashAtRef.current = null

      const current = betRef.current
      if (current.status === 'active' && !cashedRef.current) {
        setBet({
          ...current,
          status: 'lost',
          cashoutAt: null,
          profit: -current.amount,
        })
      }

      if (collectHistoryRef.current) {
        historyIdRef.current += 1
        setHistory((h) =>
          [...h, { id: historyIdRef.current, crash: finalM }].slice(-historyLimit),
        )
      }

      const nextLeft = Math.max(0, playsLeftRef.current - 1)
      playsLeftRef.current = nextLeft
      setPlaysLeft(nextLeft)

      window.setTimeout(() => {
        if (!alive) return
        if (nextLeft <= 0) {
          pauseLoopRef.current = true
          setSessionEnded(true)
          setBet((prev) => (prev.status === 'queued' ? prev : idleBet()))
          return
        }
        setRoundId((r) => r + 1)
        setBet((prev) => (prev.status === 'queued' ? prev : idleBet()))
        cashedRef.current = false
        setPoints([{ t: 0, m: 1 }])
        setMultiplier(1)
        setCrashPoint(null)
        phaseRef.current = 'betting'
        setPhase('betting')
        betDeadlineRef.current = performance.now() + bettingMs
        tickBettingRef.current()
      }, crashHoldMs)
    }

    finishCrashRef.current = finishCrash

    const tickFlying = () => {
      if (!alive || phaseRef.current !== 'flying') return
      const t = (performance.now() - startRef.current) / 1000
      const m = multiplierAt(t)
      const crashAt = crashAtRef.current

      if (crashAt != null && m >= crashAt) {
        setMultiplier(crashAt)
        setPoints((prev) =>
          appendChartPoint(prev, { t, m: crashAt }, maxChartPoints),
        )
        finishCrash(crashAt)
        return
      }

      setMultiplier(m)
      setPoints((prev) => appendChartPoint(prev, { t, m }, maxChartPoints))

      const current = betRef.current
      if (
        current.status === 'active' &&
        !cashedRef.current &&
        current.autoCashout != null &&
        m >= current.autoCashout
      ) {
        cashOut(current.autoCashout)
      }

      rafRef.current = requestAnimationFrame(tickFlying)
    }

    const startFlight = () => {
      if (pauseLoopRef.current) return
      cashedRef.current = false
      crashAtRef.current = generateCrashPoint(rtp)
      setCrashPoint(null)

      setBet((current) => {
        if (current.status === 'queued') {
          return { ...current, status: 'active' }
        }
        return current
      })

      phaseRef.current = 'flying'
      setPhase('flying')
      startRef.current = performance.now()
      setPoints([{ t: 0, m: 1 }])
      setMultiplier(1)
      rafRef.current = requestAnimationFrame(tickFlying)
    }

    const tickBetting = () => {
      if (!alive || phaseRef.current !== 'betting' || pauseLoopRef.current) return
      const left = betDeadlineRef.current - performance.now()
      setCountdown(Math.max(0, left / 1000))
      if (left <= 0) {
        startFlight()
        return
      }
      rafRef.current = requestAnimationFrame(tickBetting)
    }

    tickBettingRef.current = tickBetting

    phaseRef.current = 'betting'
    setPhase('betting')
    betDeadlineRef.current = performance.now() + bettingMs
    tickBetting()

    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [cashOut, bettingMs, crashHoldMs, historyLimit, maxChartPoints])

  const manualCashOut = useCallback(() => {
    if (phaseRef.current !== 'flying') return
    if (betRef.current.status !== 'active') return
    cashOut(multiplier)
  }, [cashOut, multiplier])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const setCollectHistory = useCallback((enabled: boolean) => {
    collectHistoryRef.current = enabled
  }, [])

  return {
    phase,
    multiplier,
    countdown,
    crashPoint,
    balance,
    history,
    bet,
    points,
    roundId,
    playsLeft,
    sessionEnded,
    sessionPlays,
    placeBet,
    cancelBet,
    manualCashOut,
    clearHistory,
    setCollectHistory,
    resetSession,
  }
}
