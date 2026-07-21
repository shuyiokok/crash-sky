import { useEffect, useMemo, useState } from 'react'
import { computeMaxBet, gameConfig } from '../../config/gameConfig'
import type { BetState, Phase } from '../../lib/gameTypes'
import { PROTO_AUTO_DEFAULT, PROTO_BET_DEFAULT } from '../prototypeData'

interface Props {
  phase: Phase
  balance: number
  bet: BetState
  multiplier: number
  onPlace: (amount: number, autoCashout: number | null) => boolean
  onCancel: () => void
  onCashOut: () => void
}

export function BottomCtrl({
  phase,
  balance,
  bet,
  multiplier,
  onPlace,
  onCancel,
  onCashOut,
}: Props) {
  const { minBet, betStep, autoStep } = gameConfig.economy
  const maxBet = useMemo(() => computeMaxBet(balance), [balance])
  const [autoAt, setAutoAt] = useState(PROTO_AUTO_DEFAULT)
  const [autoOn, setAutoOn] = useState(false)
  const [autoBetOn, setAutoBetOn] = useState(false)
  const [amount, setAmount] = useState(PROTO_BET_DEFAULT)

  useEffect(() => {
    setAmount((a) => Math.min(Math.max(minBet, a), maxBet))
  }, [maxBet, minBet])

  const canBet =
    phase === 'betting' && bet.status !== 'queued' && balance >= minBet
  const canNextRoundBet =
    (phase === 'flying' || phase === 'crashed') &&
    bet.status === 'idle' &&
    balance >= minBet
  const canCancel = bet.status === 'queued'
  const canCash = phase === 'flying' && bet.status === 'active'
  const controlsOpen = canBet || canNextRoundBet || autoBetOn || canCancel
  const cashPayout = bet.amount * multiplier
  const atMinAmount = amount <= minBet

  useEffect(() => {
    if (!autoBetOn) return
    if (!canBet) return
    onPlace(amount, autoOn ? autoAt : null)
  }, [autoBetOn, canBet, amount, autoOn, autoAt, onPlace, phase, bet.status])

  return (
    <footer className="BottomCtrl">
      <div className="BottomCtrl__left">
        <button
          type="button"
          className="BottomCtrl__circle"
          disabled={!controlsOpen}
          onClick={() =>
            setAutoAt((v) => Math.max(1.01, Math.round((v - autoStep) * 10) / 10))
          }
        >
          −
        </button>
        <input
          className="BottomCtrl__input"
          type="number"
          value={autoAt}
          step={autoStep}
          disabled={!controlsOpen}
          onChange={(e) => setAutoAt(Number(e.target.value))}
          aria-label="自动撤退倍率"
        />
        <span className="BottomCtrl__suffix">X</span>
        <button
          type="button"
          className="BottomCtrl__circle"
          disabled={!controlsOpen}
          onClick={() =>
            setAutoAt((v) => Math.max(1.01, Math.round((v + autoStep) * 10) / 10))
          }
        >
          +
        </button>
        <label className="BottomCtrl__check">
          <input
            type="checkbox"
            className="ui-squareCheck"
            checked={autoOn}
            onChange={(e) => setAutoOn(e.target.checked)}
          />
          自动撤退
        </label>
      </div>

      <div className="BottomCtrl__right">
        <button
          type="button"
          className={`BottomCtrl__autoBet${autoBetOn ? ' is-on' : ''}`}
          aria-pressed={autoBetOn}
          onClick={() => setAutoBetOn((v) => !v)}
        >
          自动下注
        </button>

        {!atMinAmount && (
          <button
            type="button"
            className="BottomCtrl__circle"
            disabled={!controlsOpen}
            onClick={() => setAmount((a) => Math.max(minBet, a - betStep))}
          >
            −
          </button>
        )}
        <input
          className="BottomCtrl__input BottomCtrl__input--amt"
          type="number"
          value={amount}
          disabled={!controlsOpen}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isNaN(n)) return
            setAmount(Math.min(maxBet, Math.max(minBet, Math.floor(n))))
          }}
          aria-label="下注金额"
        />
        <button
          type="button"
          className="BottomCtrl__circle"
          disabled={!controlsOpen}
          onClick={() => setAmount((a) => Math.min(maxBet, a + betStep))}
        >
          +
        </button>
        <button
          type="button"
          className="BottomCtrl__max"
          disabled={!controlsOpen}
          onClick={() => setAmount(maxBet)}
        >
          MAX
        </button>

        {canBet && (
          <button
            type="button"
            className="BottomCtrl__bet"
            onClick={() => onPlace(amount, autoOn ? autoAt : null)}
          >
            确认
          </button>
        )}
        {canNextRoundBet && (
          <button
            type="button"
            className="BottomCtrl__bet is-next"
            onClick={() => onPlace(amount, autoOn ? autoAt : null)}
          >
            <span className="BottomCtrl__betLine">确认</span>
            <span className="BottomCtrl__betSub">下一回合</span>
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="BottomCtrl__bet is-cancel"
            onClick={() => {
              if (autoBetOn) setAutoBetOn(false)
              onCancel()
            }}
          >
            取消
          </button>
        )}
        {canCash && (
          <button type="button" className="BottomCtrl__bet is-cash" onClick={onCashOut}>
            <span className="BottomCtrl__cashAmt">{formatCoins(cashPayout)}</span>
            <span className="BottomCtrl__betSub">领奖</span>
          </button>
        )}
        {!canBet && !canNextRoundBet && !canCancel && !canCash && (
          <button type="button" className="BottomCtrl__bet is-disabled" disabled>
            请稍候
          </button>
        )}
      </div>
    </footer>
  )
}

function formatCoins(n: number) {
  return Math.floor(n).toLocaleString('en-US')
}
