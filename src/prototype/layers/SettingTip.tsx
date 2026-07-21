/**
 * 图层 SettingTip（左下角独立组件）
 * 交互：勾选后写入 localStorage，当日局后不再自动弹窗
 */
export function SettingTip({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="SettingTip">
      <input
        type="checkbox"
        className="ui-squareCheck"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      今日不再自动弹出
    </label>
  )
}
