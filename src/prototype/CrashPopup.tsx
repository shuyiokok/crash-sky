/**
 * 冲上云霄 · 局后弹窗
 */
import { useEffect, useState } from 'react'
import type { useCrashGame } from '../hooks/useCrashGame'
import { BottomCtrl } from './layers/BottomCtrl'
import { ChartMain } from './layers/ChartMain'
import { Mask } from './layers/Mask'
import { SettingTip } from './layers/SettingTip'
import { TopBar } from './layers/TopBar'
import { SUPPRESS_KEY, todayKey } from './prototypeData'
import './crash-prototype.css'

type GameApi = ReturnType<typeof useCrashGame>

interface Props {
  game: GameApi
  open: boolean
  onClose: () => void
  suppressToday: boolean
  onSuppressChange: (v: boolean) => void
}

export function CrashPopup({
  game,
  open,
  onClose,
  suppressToday,
  onSuppressChange,
}: Props) {
  const [confirmClose, setConfirmClose] = useState(false)

  useEffect(() => {
    if (open) {
      game.clearHistory()
      game.setCollectHistory(true)
      if (game.sessionEnded || game.playsLeft <= 0) {
        game.resetSession()
      }
    } else {
      game.setCollectHistory(false)
      setConfirmClose(false)
    }
  }, [open])

  if (!open) return null

  const requestClose = () => {
    if (game.playsLeft > 0 && !game.sessionEnded) {
      setConfirmClose(true)
      return
    }
    onClose()
  }

  return (
    <Mask>
      <TopBar
        history={game.history}
        playsLeft={game.playsLeft}
        onClose={requestClose}
      />
      <ChartMain
        points={game.points}
        multiplier={game.multiplier}
        phase={game.phase}
        crashPoint={game.crashPoint}
        countdown={game.countdown}
        bet={game.bet}
        roundId={game.roundId}
      />
      <BottomCtrl
        phase={game.phase}
        balance={game.balance}
        bet={game.bet}
        multiplier={game.multiplier}
        onPlace={game.placeBet}
        onCancel={game.cancelBet}
        onCashOut={game.manualCashOut}
      />
      <SettingTip
        checked={suppressToday}
        onChange={(v) => {
          onSuppressChange(v)
          if (v) localStorage.setItem(SUPPRESS_KEY, todayKey())
          else localStorage.removeItem(SUPPRESS_KEY)
        }}
      />

      {game.sessionEnded && (
        <div className="CrashDialog" role="dialog" aria-modal>
          <div className="CrashDialog__card">
            <h3>本轮已结束</h3>
            <p>已完成 {game.sessionPlays} 局，可再开一轮或返回大厅。</p>
            <div className="CrashDialog__actions">
              <button type="button" onClick={() => game.resetSession()}>
                再玩一轮
              </button>
              <button type="button" className="is-ghost" onClick={onClose}>
                返回大厅
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClose && (
        <div className="CrashDialog" role="dialog" aria-modal>
          <div className="CrashDialog__card">
            <h3>确认退出？</h3>
            <p>还剩 {game.playsLeft} 局可玩，退出后本轮进度结束。</p>
            <div className="CrashDialog__actions">
              <button type="button" className="is-danger" onClick={onClose}>
                退出
              </button>
              <button
                type="button"
                className="is-ghost"
                onClick={() => setConfirmClose(false)}
              >
                继续玩
              </button>
            </div>
          </div>
        </div>
      )}
    </Mask>
  )
}

export function useCrashPopupGate() {
  /** 默认停在开始页，点「开始游戏」后再进入 */
  const [open, setOpen] = useState(false)
  const [suppressToday, setSuppressToday] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(SUPPRESS_KEY) === todayKey()) {
      setSuppressToday(true)
    }
  }, [])

  return {
    open,
    setOpen,
    suppressToday,
    setSuppressToday,
    close: () => setOpen(false),
    openManual: () => setOpen(true),
  }
}
