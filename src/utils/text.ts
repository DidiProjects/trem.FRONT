/** Lower case without accents, so "audio" finds "Áudio". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`
}
