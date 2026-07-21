/**
 * 冲上云霄 · 可分享试玩入口
 * 先显示开始页，点「开始游戏」后再进入对局
 */
import { CrashPopup, useCrashPopupGate } from './prototype/CrashPopup'
import { useCrashGame } from './hooks/useCrashGame'
import { gameConfig } from './config/gameConfig'
import './App.css'

function App() {
  const game = useCrashGame()
  const gate = useCrashPopupGate()

  return (
    <div className="app-root">
      {!gate.open && (
        <div className="lobby">
          <p className="lobby-badge">抖小川麻 · 局后小游戏演示</p>
          <h1 className="lobby-title">{gameConfig.meta.title}</h1>
          <p className="lobby-sub">{gameConfig.meta.subtitle}</p>
          <p className="chip-balance">
            免费筹码{' '}
            <strong>{Math.floor(game.balance).toLocaleString('en-US')}</strong>
          </p>
          <p className="lobby-hint">本游戏纯属演示 · 非真实货币 · 可分享试玩</p>
          <button
            type="button"
            className="open-crash"
            onClick={() => {
              game.resetSession()
              gate.openManual()
            }}
          >
            开始游戏
          </button>
          <ul className="lobby-tips">
            <li>5 秒内确认下注，倍率上涨后点「领奖」提现</li>
            <li>崩盘前没领走则本金归零 · 本地结算</li>
            <li>MAX = 持有筹码 ÷ 5（上限 1 亿）</li>
          </ul>
        </div>
      )}

      <CrashPopup
        game={game}
        open={gate.open}
        onClose={gate.close}
        suppressToday={gate.suppressToday}
        onSuppressChange={gate.setSuppressToday}
      />
    </div>
  )
}

export default App
