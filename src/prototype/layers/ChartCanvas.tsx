import { useEffect, useRef } from 'react'
import type { Phase } from '../../lib/gameTypes'

interface Point {
  t: number
  m: number
}

interface Props {
  points: Point[]
  multiplier: number
  phase: Phase
  crashPoint: number | null
  countdown: number
}

/**
 * ChartMain 子组件：坐标轴网格 + 浅灰渐变曲线 + 红色发光光点 + 中心倍率
 * 坐标刻度按原型：Y=0/16x/32x，X=0/16.5s/Total 55s
 */
export function ChartCanvas({
  points,
  multiplier,
  phase,
  crashPoint,
  countdown,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = rect.width
    const h = rect.height
    const pad = { l: 48, r: 18, t: 22, b: 36 }
    const plotW = w - pad.l - pad.r
    const plotH = h - pad.t - pad.b
    ctx.clearRect(0, 0, w, h)

    // 原型坐标系范围（超量时轻微外扩以免裁切）
    const maxM = Math.max(32, multiplier * 1.02)
    const liveT = points.at(-1)?.t ?? 0
    const maxT = Math.max(55, liveT)

    const xOf = (t: number) => pad.l + (Math.min(t, maxT) / maxT) * plotW
    const yOf = (m: number) => pad.t + plotH - (Math.min(m, maxM) / maxM) * plotH

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(w - pad.r, y)
      ctx.stroke()
      const x = pad.l + (plotW * i) / 4
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, pad.t + plotH)
      ctx.stroke()
    }

    // Y 轴：16x、32x（原点 0 不显示）
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '600 12px Sora, sans-serif'
    ctx.textAlign = 'right'
    ;[
      { m: 16, label: '16x' },
      { m: 32, label: '32x' },
    ].forEach(({ m, label }) => {
      ctx.fillText(label, pad.l - 8, yOf(m) + 4)
    })

    // X 轴：16.5s、Total 55s（原点 0 不显示）
    ctx.textAlign = 'center'
    ;[
      { t: 16.5, label: '16.5s' },
      { t: 55, label: 'Total 55s' },
    ].forEach(({ t, label }) => {
      ctx.fillText(label, xOf(t), h - 12)
    })

    if (points.length > 1) {
      const grad = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0)
      if (phase === 'crashed') {
        grad.addColorStop(0, 'rgba(160,165,175,0.35)')
        grad.addColorStop(1, '#ff4458')
      } else {
        grad.addColorStop(0, 'rgba(180,186,196,0.25)')
        grad.addColorStop(0.5, 'rgba(200,206,216,0.7)')
        grad.addColorStop(1, 'rgba(230,234,240,0.95)')
      }

      ctx.beginPath()
      ctx.strokeStyle = grad
      ctx.lineWidth = 2.6
      ctx.lineJoin = 'round'
      points.forEach((p, i) => {
        const x = xOf(p.t)
        const y = yOf(Math.max(0, p.m))
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      const last = points[points.length - 1]!
      const lx = xOf(last.t)
      const ly = yOf(Math.max(0, last.m))

      // 红色发光光点
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 18)
      glow.addColorStop(0, 'rgba(255,68,88,0.95)')
      glow.addColorStop(0.4, 'rgba(255,68,88,0.4)')
      glow.addColorStop(1, 'rgba(255,68,88,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(lx, ly, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.fillStyle = '#ff4458'
      ctx.arc(lx, ly, 5, 0, Math.PI * 2)
      ctx.fill()

      // 崩盘爆炸
      if (phase === 'crashed') {
        ctx.strokeStyle = 'rgba(255,68,88,0.9)'
        ctx.lineWidth = 2
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8
          ctx.beginPath()
          ctx.moveTo(lx + Math.cos(a) * 7, ly + Math.sin(a) * 7)
          ctx.lineTo(lx + Math.cos(a) * 22, ly + Math.sin(a) * 22)
          ctx.stroke()
        }
      }
    }
  }, [points, multiplier, phase, crashPoint])

  const center =
    phase === 'betting'
      ? `${Math.max(0, countdown).toFixed(1)}s`
      : phase === 'crashed'
        ? `${(crashPoint ?? multiplier).toFixed(2)}X`
        : `${multiplier.toFixed(2)}X`

  return (
    <div className={`ChartMain__canvasWrap phase-${phase}`}>
      <canvas ref={canvasRef} className="ChartMain__canvas" />
      <div className="ChartMain__centerMult">
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
      </div>
    </div>
  )
}
