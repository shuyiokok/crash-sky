import { useEffect, useMemo, useRef, useState } from 'react'
import { timeToReach } from '../../lib/multiplier'
import type { BetState, Phase } from '../../lib/gameTypes'

interface Point {
  t: number
  m: number
}

export interface ExitMarker {
  key: string
  name: string
  avatarHue: number
  mult: number
  isPlayer: boolean
}

interface Props {
  points: Point[]
  multiplier: number
  phase: Phase
  crashPoint: number | null
  countdown: number
  bet: BetState
  exitMarkers: ExitMarker[]
}

const PAD = { l: 48, r: 18, t: 22, b: 36 }

function strokeCurve(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
) {
  if (pts.length < 2) return
  ctx.beginPath()
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()
}

/**
 * ChartMain 子组件：坐标轴网格 + 曲线光效 + 中心倍率
 * + 等待下注文案 / 机器人退出标记 / 玩家退出倍率框
 */
export function ChartCanvas({
  points,
  multiplier,
  phase,
  crashPoint,
  countdown,
  bet,
  exitMarkers,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1, h: 1 })
  /** 开始淡出的 key */
  const [leavingKeys, setLeavingKeys] = useState<Set<string>>(() => new Set())
  /** 淡出结束、不再渲染的 key */
  const [goneKeys, setGoneKeys] = useState<Set<string>>(() => new Set())
  const seenRef = useRef<Map<string, number>>(new Map())
  const timersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (!r) return
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // 机器人退出：显示 1s 后淡出，再移除
  useEffect(() => {
    const bots = exitMarkers.filter((m) => !m.isPlayer)
    const liveKeys = new Set(bots.map((b) => b.key))

    if (bots.length === 0) {
      for (const id of timersRef.current.values()) window.clearTimeout(id)
      timersRef.current.clear()
      seenRef.current.clear()
      setLeavingKeys(new Set())
      setGoneKeys(new Set())
      return
    }

    for (const bot of bots) {
      if (seenRef.current.has(bot.key)) continue
      seenRef.current.set(bot.key, performance.now())
      const tid = window.setTimeout(() => {
        setLeavingKeys((prev) => {
          const next = new Set(prev)
          next.add(bot.key)
          return next
        })
        timersRef.current.delete(bot.key)
      }, 1000)
      timersRef.current.set(bot.key, tid)
    }

    for (const [key, tid] of timersRef.current) {
      if (!liveKeys.has(key)) {
        window.clearTimeout(tid)
        timersRef.current.delete(key)
      }
    }
  }, [exitMarkers])

  useEffect(() => {
    return () => {
      for (const id of timersRef.current.values()) window.clearTimeout(id)
    }
  }, [])

  const liveT = points.at(-1)?.t ?? 0
  const maxM = Math.max(32, multiplier * 1.02)
  const maxT = Math.max(55, liveT)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const { w, h } = size
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const plotW = w - PAD.l - PAD.r
    const plotH = h - PAD.t - PAD.b
    ctx.clearRect(0, 0, w, h)

    const xOf = (t: number) => PAD.l + (Math.min(t, maxT) / maxT) * plotW
    const yOf = (m: number) => PAD.t + plotH - (Math.min(m, maxM) / maxM) * plotH

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = PAD.t + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(PAD.l, y)
      ctx.lineTo(w - PAD.r, y)
      ctx.stroke()
      const x = PAD.l + (plotW * i) / 4
      ctx.beginPath()
      ctx.moveTo(x, PAD.t)
      ctx.lineTo(x, PAD.t + plotH)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font = '600 12px Sora, sans-serif'
    ctx.textAlign = 'right'
    ;[
      { m: 16, label: '16x' },
      { m: 32, label: '32x' },
    ].forEach(({ m, label }) => {
      ctx.fillText(label, PAD.l - 8, yOf(m) + 4)
    })

    ctx.textAlign = 'center'
    ;[
      { t: 16.5, label: '16.5s' },
      { t: 55, label: 'Total 55s' },
    ].forEach(({ t, label }) => {
      ctx.fillText(label, xOf(t), h - 12)
    })

    if (points.length < 2) return

    const pts = points.map((p) => ({
      x: xOf(p.t),
      y: yOf(Math.max(0, p.m)),
    }))
    const last = pts[pts.length - 1]!
    const crashed = phase === 'crashed'

    // 曲线下方柔光填充
    ctx.beginPath()
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.lineTo(last.x, PAD.t + plotH)
    ctx.lineTo(pts[0]!.x, PAD.t + plotH)
    ctx.closePath()
    const fillGrad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + plotH)
    if (crashed) {
      fillGrad.addColorStop(0, 'rgba(255, 90, 110, 0.18)')
      fillGrad.addColorStop(1, 'rgba(255, 90, 110, 0)')
    } else {
      fillGrad.addColorStop(0, 'rgba(90, 200, 255, 0.16)')
      fillGrad.addColorStop(0.55, 'rgba(120, 210, 255, 0.06)')
      fillGrad.addColorStop(1, 'rgba(90, 200, 255, 0)')
    }
    ctx.fillStyle = fillGrad
    ctx.fill()

    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // 外层宽拖尾光晕
    ctx.strokeStyle = crashed
      ? 'rgba(255, 80, 100, 0.18)'
      : 'rgba(80, 190, 255, 0.22)'
    ctx.lineWidth = 14
    strokeCurve(ctx, pts)

    // 中层光带
    ctx.strokeStyle = crashed
      ? 'rgba(255, 120, 140, 0.35)'
      : 'rgba(160, 230, 255, 0.4)'
    ctx.lineWidth = 6
    strokeCurve(ctx, pts)

    // 核心亮线（沿路径由淡到亮）
    const core = ctx.createLinearGradient(pts[0]!.x, pts[0]!.y, last.x, last.y)
    if (crashed) {
      core.addColorStop(0, 'rgba(255, 180, 190, 0.35)')
      core.addColorStop(0.7, 'rgba(255, 140, 150, 0.85)')
      core.addColorStop(1, '#ff5a6e')
    } else {
      core.addColorStop(0, 'rgba(180, 230, 255, 0.25)')
      core.addColorStop(0.55, 'rgba(210, 245, 255, 0.75)')
      core.addColorStop(1, '#ffffff')
    }
    ctx.strokeStyle = core
    ctx.lineWidth = 2.4
    strokeCurve(ctx, pts)

    // 头部光核（多层柔光，避免死红实心块）
    const tipColor = crashed
      ? { a: 'rgba(255, 90, 110, 0.55)', b: 'rgba(255, 180, 200, 0.9)', c: '#fff' }
      : { a: 'rgba(90, 210, 255, 0.45)', b: 'rgba(210, 245, 255, 0.95)', c: '#fff' }

    const bloom = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 28)
    bloom.addColorStop(0, tipColor.b)
    bloom.addColorStop(0.35, tipColor.a)
    bloom.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bloom
    ctx.beginPath()
    ctx.arc(last.x, last.y, 28, 0, Math.PI * 2)
    ctx.fill()

    const mid = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 10)
    mid.addColorStop(0, tipColor.c)
    mid.addColorStop(0.5, tipColor.b)
    mid.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = mid
    ctx.beginPath()
    ctx.arc(last.x, last.y, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.fillStyle = tipColor.c
    ctx.arc(last.x, last.y, 2.6, 0, Math.PI * 2)
    ctx.fill()

    if (crashed) {
      ctx.strokeStyle = 'rgba(255, 120, 140, 0.75)'
      ctx.lineWidth = 1.6
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8
        ctx.beginPath()
        ctx.moveTo(last.x + Math.cos(a) * 5, last.y + Math.sin(a) * 5)
        ctx.lineTo(last.x + Math.cos(a) * 18, last.y + Math.sin(a) * 18)
        ctx.stroke()
      }
    }
  }, [points, multiplier, phase, crashPoint, size, maxM, maxT])

  const plotPos = useMemo(() => {
    const plotW = size.w - PAD.l - PAD.r
    const plotH = size.h - PAD.t - PAD.b
    return (t: number, m: number) => ({
      left: ((PAD.l + (Math.min(t, maxT) / maxT) * plotW) / size.w) * 100,
      top: ((PAD.t + plotH - (Math.min(m, maxM) / maxM) * plotH) / size.h) * 100,
    })
  }, [size, maxM, maxT])

  const botExits = exitMarkers.filter(
    (m) => !m.isPlayer && m.mult != null && !goneKeys.has(m.key),
  )
  const playerCashed = bet.status === 'cashed' && bet.cashoutAt != null

  const center =
    phase === 'betting'
      ? `${Math.max(0, countdown).toFixed(1)}s`
      : phase === 'crashed'
        ? `${(crashPoint ?? multiplier).toFixed(2)}X`
        : `${multiplier.toFixed(2)}X`

  return (
    <div ref={wrapRef} className={`ChartMain__canvasWrap phase-${phase}`}>
      <canvas ref={canvasRef} className="ChartMain__canvas" />

      <div className="ChartMain__exitLayer" aria-hidden>
        {botExits.map((m) => {
          const pos = plotPos(timeToReach(m.mult), m.mult)
          const leaving = leavingKeys.has(m.key)
          return (
            <div
              key={m.key}
              className={`ChartMain__botExit${leaving ? ' is-leaving' : ''}`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              onAnimationEnd={(e) => {
                if (e.animationName !== 'botExitOut') return
                setGoneKeys((prev) => {
                  const next = new Set(prev)
                  next.add(m.key)
                  return next
                })
              }}
            >
              <span
                className="ChartMain__botExitAvatar"
                style={{
                  background: `linear-gradient(145deg, hsl(${m.avatarHue} 72% 62%), hsl(${(m.avatarHue + 40) % 360} 65% 42%))`,
                }}
              />
              <span className="ChartMain__botExitName">{m.name}</span>
            </div>
          )
        })}
      </div>

      <div className="ChartMain__centerMult">
        <div className="ChartMain__centerStack">
          <span
            className={[
              'ChartMain__multText',
              phase === 'flying' ? 'is-rolling' : '',
              phase === 'crashed' ? 'is-crash' : '',
              phase === 'betting' ? 'is-wait' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {center}
          </span>
          {phase === 'betting' && (
            <span className="ChartMain__waitBet">等待下注</span>
          )}
          {playerCashed && (
            <span className="ChartMain__playerCashout">
              {bet.cashoutAt!.toFixed(2)}X
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
