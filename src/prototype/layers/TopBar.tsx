import { useLayoutEffect, useRef, useState } from 'react'
import { colorForCrash } from '../../data/prototypeHistory'
import type { HistoryItem } from '../../lib/gameTypes'

interface Props {
  history: HistoryItem[]
  playsLeft: number
  onClose: () => void
}

export function TopBar({ history, playsLeft, onClose }: Props) {
  const slotRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState(0)

  useLayoutEffect(() => {
    const slot = slotRef.current
    const measure = measureRef.current
    if (!slot || !measure) return

    const fit = () => {
      const avail = slot.clientWidth
      const kids = Array.from(measure.children) as HTMLElement[]
      if (kids.length === 0 || avail <= 0) {
        setStart(0)
        return
      }

      const styles = getComputedStyle(measure)
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0

      let used = 0
      let count = 0
      for (let i = kids.length - 1; i >= 0; i--) {
        const w = kids[i]!.offsetWidth
        const next = count === 0 ? w : used + gap + w
        if (next > avail) break
        used = next
        count += 1
      }
      setStart(Math.max(0, history.length - count))
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(slot)
    return () => ro.disconnect()
  }, [history])

  const visible = history.slice(start)

  return (
    <header className="TopBar">
      <div className="TopBar__history">
        <span className="TopBar__historyLabel">历史</span>

        <div ref={slotRef} className="TopBar__pillsSlot" aria-label="历史倍率">
          <div ref={measureRef} className="TopBar__pills TopBar__pills--measure" aria-hidden>
            {history.map((item) => (
              <span
                key={`m-${item.id}`}
                className={`TopBar__pill tone-${colorForCrash(item.crash)}`}
              >
                {formatX(item.crash)}
              </span>
            ))}
          </div>

          <div className="TopBar__pills">
            {visible.map((item) => (
              <span
                key={item.id}
                className={`TopBar__pill tone-${colorForCrash(item.crash)}`}
              >
                {formatX(item.crash)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="TopBar__right">
        <span className="TopBar__plays">剩余 {playsLeft} 局</span>
        <button type="button" className="TopBar__close" onClick={onClose}>
          关闭
        </button>
      </div>
    </header>
  )
}

function formatX(n: number) {
  if (n >= 100) return `${Number(n.toFixed(1))}x`
  return `${n.toFixed(2)}x`
}
