import type { ReactNode } from 'react'

/**
 * 图层 Mask
 * - 全屏 50% 透明黑遮罩
 * - 主体弹窗背景 #0E1218
 */
export function Mask({ children }: { children: ReactNode }) {
  return (
    <div className="Mask" role="dialog" aria-modal="true" aria-label="Crash小游戏弹窗">
      {/* 半透明遮罩层 */}
      <div className="Mask__dim" />
      {/* 弹窗主体容器 */}
      <div className="Mask__panel">{children}</div>
    </div>
  )
}
