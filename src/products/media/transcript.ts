import type { Segment } from '@/services/mediaApi'

/** 75.5 -> "01:15"; above an hour "1:01:15". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}

function stamp(seconds: number, separator: ',' | '.'): string {
  const ms = Math.round(seconds * 1000)
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${s}${separator}${String(ms % 1000).padStart(3, '0')}`
}

export function toSrt(segments: Segment[]): string {
  return segments.map((seg, i) => `${i + 1}\n${stamp(seg.start, ',')} --> ${stamp(seg.end, ',')}\n${seg.text}\n`).join('\n')
}

export function toVtt(segments: Segment[]): string {
  return `WEBVTT\n\n${segments.map((seg) => `${stamp(seg.start, '.')} --> ${stamp(seg.end, '.')}\n${seg.text}\n`).join('\n')}`
}

export function toText(segments: Segment[]): string {
  return segments.map((seg) => `[${clock(seg.start)}] ${seg.text}`).join('\n')
}

/** "1:05", "01:05", "65" or "1:01:05" -> seconds; null when it is not a time. */
export function parseClock(input: string): number | null {
  const parts = input.trim().split(':')
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  return parts.map(Number).reduce((total, part) => total * 60 + part, 0)
}
