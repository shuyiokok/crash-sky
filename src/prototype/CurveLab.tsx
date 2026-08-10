/**
 * 倍率增长曲线调参台
 * 改参数 → 实时看曲线、到达时间、崩盘概率；改完直接对游戏生效。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { gameConfig } from '../config/gameConfig'
import {
  getGrowthStages,
  resetGrowthStages,
  setGrowthStages,
  subscribeGrowth,
  type GrowthStage,
} from '../config/growthStore'
import {
  multiplierAt,
  survivalProbability,
  timeToReach,
} from '../lib/multiplier'
import './curve-lab.css'

const CHECKPOINTS = [1.5, 2, 3, 5, 10, 20, 50, 100]

interface Props {
  onBack: () => void
}

export function CurveLab({ onBack }: Props) {
  const stages = useSyncExternalStore(subscribeGrowth, getGrowthStages)

  const [viewSeconds, setViewSeconds] = useState(60)
  const [logScale, setLogScale] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [playT, setPlayT] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1, h: 1 })

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

  // 实时播放：按真实速度推进时间轴
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const start = performance.now() - playT * 1000
    const tick = () => {
      const t = (performance.now() - start) / 1000
      if (t >= viewSeconds) {
        setPlayT(viewSeconds)
        setPlaying(false)
        return
      }
      setPlayT(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, viewSeconds])

  const updateStage = useCallback(
    (index: number, patch: Partial<GrowthStage>) => {
      const next = stages.map((s, i) => (i === index ? { ...s, ...patch } : s))
      setGrowthStages(next)
    },
    [stages],
  )

  const addStage = useCallback(() => {
    const next = stages.map((s) => ({ ...s }))
    const last = next[next.length - 1]!
    const prevUntil = next.length > 1 ? next[next.length - 2]!.until : 1
    // 把原本的无限档拆成「有限档 + 新的无限档」
    last.until = Math.max(prevUntil * 2, 2)
    next.push({ rate: Math.max(0.005, last.rate * 0.7), until: Infinity })
    setGrowthStages(next)
  }, [stages])

  const removeStage = useCallback(
    (index: number) => {
      if (stages.length <= 1) return
      const next = stages
        .filter((_, i) => i !== index)
        .map((s) => ({ ...s }))
      next[next.length - 1]!.until = Infinity
      setGrowthStages(next)
    },
    [stages],
  )

  const maxMultiplier = useMemo(
    () => multiplierAt(viewSeconds, stages),
    [viewSeconds, stages],
  )

  const stats = useMemo(() => {
    const { rtp } = gameConfig.crash
    // C = rtp/U：中位、90%、99% 分位对应的崩盘倍率
    const median = Math.max(1, rtp / 0.5)
    const p90 = Math.max(1, rtp / 0.1)
    const p99 = Math.max(1, rtp / 0.01)

    // 期望局时长：对 U 均匀采样后取平均
    const samples = 400
    let sum = 0
    for (let i = 0; i < samples; i++) {
      const u = (i + 0.5) / samples
      sum += timeToReach(Math.max(1, rtp / u), stages)
    }

    return {
      median,
      medianT: timeToReach(median, stages),
      p90,
      p90T: timeToReach(p90, stages),
      p99,
      p99T: timeToReach(p99, stages),
      avgT: sum / samples,
    }
  }, [stages])

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
    ctx.clearRect(0, 0, w, h)

    const pad = { l: 56, r: 20, t: 18, b: 34 }
    const plotW = w - pad.l - pad.r
    const plotH = h - pad.t - pad.b
    if (plotW <= 0 || plotH <= 0) return

    const yMax = Math.max(2, maxMultiplier)
    const yOf = (m: number) => {
      const clamped = Math.min(Math.max(m, 1), yMax)
      const ratio = logScale
        ? Math.log(clamped) / Math.log(yMax)
        : (clamped - 1) / (yMax - 1)
      return pad.t + plotH - ratio * plotH
    }
    const xOf = (t: number) => pad.l + (Math.min(t, viewSeconds) / viewSeconds) * plotW

    // Y 轴刻度
    const yTicks = logScale
      ? [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((v) => v <= yMax)
      : Array.from({ length: 5 }, (_, i) => 1 + ((yMax - 1) * i) / 4)

    ctx.font = '600 11px Sora, sans-serif'
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    ctx.textAlign = 'right'
    for (const v of yTicks) {
      const y = yOf(v)
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(w - pad.r, y)
      ctx.stroke()
      ctx.fillText(`${v >= 100 ? Math.round(v) : v}x`, pad.l - 8, y + 4)
    }

    ctx.textAlign = 'center'
    const xTickCount = 6
    for (let i = 0; i <= xTickCount; i++) {
      const t = (viewSeconds * i) / xTickCount
      const x = xOf(t)
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, pad.t + plotH)
      ctx.stroke()
      ctx.fillText(`${Math.round(t)}s`, x, h - 12)
    }

    // 阶段切换竖线
    let boundaryM = 1
    for (const stage of stages) {
      if (!Number.isFinite(stage.until)) break
      boundaryM = stage.until
      if (boundaryM > yMax) break
      const bt = timeToReach(boundaryM, stages)
      if (bt > viewSeconds) break
      const x = xOf(bt)
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.4)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, pad.t + plotH)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255, 215, 106, 0.85)'
      ctx.textAlign = 'left'
      ctx.fillText(`${boundaryM}x`, x + 4, pad.t + 12)
    }

    // 曲线
    const steps = 400
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = (viewSeconds * i) / steps
      pts.push({ x: xOf(t), y: yOf(multiplierAt(t, stages)) })
    }

    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.lineTo(pts[pts.length - 1]!.x, pad.t + plotH)
    ctx.lineTo(pts[0]!.x, pad.t + plotH)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH)
    fill.addColorStop(0, 'rgba(90, 200, 255, 0.18)')
    fill.addColorStop(1, 'rgba(90, 200, 255, 0)')
    ctx.fillStyle = fill
    ctx.fill()

    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.95)'
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // 播放光点
    if (playT > 0) {
      const px = xOf(playT)
      const py = yOf(multiplierAt(playT, stages))
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 16)
      glow.addColorStop(0, 'rgba(255,255,255,0.95)')
      glow.addColorStop(1, 'rgba(120,220,255,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(px, py, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(px, py, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [size, stages, viewSeconds, logScale, maxMultiplier, playT])

  const configSnippet = useMemo(() => {
    const lines = stages.map((s) => {
      const until = Number.isFinite(s.until) ? s.until : 'Infinity'
      return `      { rate: ${s.rate}, until: ${until} },`
    })
    return ['    stages: [', ...lines, '    ],'].join('\n')
  }, [stages])

  return (
    <div className="lab">
      <header className="lab__head">
        <div>
          <h1 className="lab__title">倍率增长调参台</h1>
          <p className="lab__sub">
            M(t) 分段指数：每段 M = 起始倍率 × e^(r·Δt)，改动即时对游戏生效
          </p>
        </div>
        <button type="button" className="lab__back" onClick={onBack}>
          返回
        </button>
      </header>

      <div className="lab__body">
        <section className="lab__panel">
          <h2 className="lab__panelTitle">阶段参数</h2>
          <div className="lab__stages">
            {stages.map((stage, i) => {
              const fromM = i === 0 ? 1 : stages[i - 1]!.until
              const isLast = i === stages.length - 1
              return (
                <div className="lab__stage" key={i}>
                  <div className="lab__stageHead">
                    <span className="lab__stageName">
                      阶段 {i + 1}
                      <em>
                        {fromM}x →{' '}
                        {Number.isFinite(stage.until) ? `${stage.until}x` : '∞'}
                      </em>
                    </span>
                    {stages.length > 1 && (
                      <button
                        type="button"
                        className="lab__mini"
                        onClick={() => removeStage(i)}
                      >
                        删除
                      </button>
                    )}
                  </div>

                  <label className="lab__field">
                    <span>增长率 r</span>
                    <input
                      type="range"
                      min={0.005}
                      max={0.6}
                      step={0.005}
                      value={stage.rate}
                      onChange={(e) =>
                        updateStage(i, { rate: Number(e.target.value) })
                      }
                    />
                    <input
                      className="lab__num"
                      type="number"
                      min={0.005}
                      step={0.005}
                      value={stage.rate}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (!Number.isFinite(v) || v <= 0) return
                        updateStage(i, { rate: v })
                      }}
                    />
                  </label>

                  <label className="lab__field">
                    <span>结束倍率</span>
                    {isLast ? (
                      <input className="lab__num" value="∞" disabled />
                    ) : (
                      <input
                        className="lab__num"
                        type="number"
                        min={Number(fromM) + 1}
                        step={1}
                        value={stage.until}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (!Number.isFinite(v) || v <= 1) return
                          updateStage(i, { until: v })
                        }}
                      />
                    )}
                  </label>
                </div>
              )
            })}
          </div>

          <div className="lab__actions">
            <button type="button" className="lab__btn" onClick={addStage}>
              新增阶段
            </button>
            <button
              type="button"
              className="lab__btn is-ghost"
              onClick={() => resetGrowthStages()}
            >
              恢复默认
            </button>
          </div>

          <h2 className="lab__panelTitle">配置片段</h2>
          <pre className="lab__code">{configSnippet}</pre>
        </section>

        <section className="lab__main">
          <div className="lab__toolbar">
            <label className="lab__tool">
              观察时长
              <input
                type="range"
                min={10}
                max={180}
                step={5}
                value={viewSeconds}
                onChange={(e) => {
                  setViewSeconds(Number(e.target.value))
                  setPlayT(0)
                  setPlaying(false)
                }}
              />
              <b>{viewSeconds}s</b>
            </label>
            <label className="lab__check">
              <input
                type="checkbox"
                checked={logScale}
                onChange={(e) => setLogScale(e.target.checked)}
              />
              对数纵轴
            </label>
            <button
              type="button"
              className="lab__btn"
              onClick={() => {
                if (playing) {
                  setPlaying(false)
                  return
                }
                setPlayT(0)
                setPlaying(true)
              }}
            >
              {playing ? '暂停' : '实时播放'}
            </button>
            <span className="lab__live">
              t = {playT.toFixed(1)}s ｜ M ={' '}
              <b>{multiplierAt(playT, stages).toFixed(2)}x</b>
            </span>
          </div>

          <div ref={wrapRef} className="lab__chart">
            <canvas ref={canvasRef} />
          </div>

          <div className="lab__stats">
            <div>
              <span>中位崩盘</span>
              <b>
                {stats.median.toFixed(2)}x ｜ {stats.medianT.toFixed(1)}s
              </b>
            </div>
            <div>
              <span>90% 局结束于</span>
              <b>{stats.p90T.toFixed(1)}s</b>
            </div>
            <div>
              <span>99% 局结束于</span>
              <b>{stats.p99T.toFixed(1)}s</b>
            </div>
            <div>
              <span>平均局时长</span>
              <b>{stats.avgT.toFixed(1)}s</b>
            </div>
          </div>

          <table className="lab__table">
            <thead>
              <tr>
                <th>倍率</th>
                <th>到达耗时</th>
                <th>能飞到的概率</th>
                <th>体感</th>
              </tr>
            </thead>
            <tbody>
              {CHECKPOINTS.map((m) => {
                const t = timeToReach(m, stages)
                const p = survivalProbability(m)
                return (
                  <tr key={m}>
                    <td>{m}x</td>
                    <td>{t.toFixed(1)}s</td>
                    <td>{(p * 100).toFixed(1)}%</td>
                    <td>
                      <span
                        className="lab__bar"
                        style={{ width: `${Math.min(100, p * 100)}%` }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
