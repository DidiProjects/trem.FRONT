/** What each trem permission unlocks, in words; other keys show as they are. */
export const PERMISSION_LABELS: Record<string, string> = {
  'trem:file_editor': 'Documentos, Imagens e Áudio e vídeo',
  'trem:ai': 'IA',
  'trem:linkedin_scraper': 'Automação: vagas no LinkedIn',
  'trem:admin': 'Administração do trem',
  'trem:airline_company': 'Companhia aérea (flight.API)',
}

export function permissionLabel(key: string): string {
  return PERMISSION_LABELS[key] ?? key
}
