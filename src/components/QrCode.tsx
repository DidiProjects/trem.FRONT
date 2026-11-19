import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** Dark modules on white, with the quiet zone scanners need, whatever the theme. */
export function QrCode({ value, label, size = 192 }: { value: string; label: string; size?: number }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`
    return { count: n + 8, path: d }
  }, [value])

  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges" style={{ borderRadius: 12, flexShrink: 0 }}>
      <rect width={count} height={count} fill="#ffffff" />
      <path d={path} fill="#0b1437" />
    </svg>
  )
}
