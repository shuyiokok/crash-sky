import type { LobbyRow } from '../../hooks/useLobbyParticipants'

interface Props {
  totalCount: number
  totalFunds: number
  rows: LobbyRow[]
  countBump?: boolean
}

export function PlayersAside({
  totalCount,
  totalFunds,
  rows,
  countBump,
}: Props) {
  return (
    <aside className="ChartMain__players">
      <div className="ChartMain__playersHead">
        <span
          className={`ChartMain__userStat${countBump ? ' is-bump' : ''}`}
        >
          <i className="ChartMain__userIco" aria-hidden />
          {totalCount}
        </span>
        <span className="ChartMain__chipTotal">
          总资金 {formatFunds(totalFunds)}
        </span>
      </div>
      <ul className="ChartMain__playerList">
        {rows.map((p) => (
          <li
            key={p.key}
            className={`ChartMain__playerRow${p.isPlayer ? ' is-player' : ''}`}
          >
            <span
              className="ChartMain__avatar"
              style={{
                background: `linear-gradient(145deg, hsl(${p.avatarHue} 72% 62%), hsl(${(p.avatarHue + 40) % 360} 65% 42%))`,
              }}
              aria-hidden
            />
            <span className="ChartMain__pid">{p.name}</span>
            {renderMult(p)}
            {renderCoins(p)}
          </li>
        ))}
      </ul>
    </aside>
  )
}

function renderMult(p: LobbyRow) {
  if (p.status === 'betting') {
    return (
      <span className="ChartMain__pending">{p.waitLabel ?? '等待中'}</span>
    )
  }
  if (p.status === 'active' && p.mult == null) {
    return <span className="ChartMain__pending">飞行中</span>
  }
  if (p.mult == null) {
    return <span className="ChartMain__pending">—</span>
  }
  return (
    <span className={`ChartMain__mult tone-${p.multTone ?? 'blue'}`}>
      {formatMult(p.mult)}
    </span>
  )
}

function renderCoins(p: LobbyRow) {
  if (p.winCoins != null) {
    return (
      <span className="ChartMain__profit is-win">{formatCoins(p.winCoins)}</span>
    )
  }
  if (p.status === 'lost') {
    return <span className="ChartMain__profit is-lose">0</span>
  }
  if (p.status === 'betting' && p.betAmount > 0) {
    return (
      <span className="ChartMain__profit is-pending">
        {formatCoins(p.betAmount)}
      </span>
    )
  }
  return <span className="ChartMain__profit is-pending">…</span>
}

function formatMult(n: number) {
  if (n >= 100) return `${Number(n.toFixed(1))}x`
  return `${n.toFixed(2)}x`
}

function formatCoins(n: number) {
  if (n >= 1000) return Math.floor(n).toLocaleString('en-US')
  return n.toFixed(0)
}

function formatFunds(n: number) {
  if (n >= 10000) return Math.floor(n).toLocaleString('en-US')
  return Math.floor(n).toString()
}
