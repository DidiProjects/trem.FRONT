/**
 * E-mail links arrive as /#verify-email=<token> or /#reset-password=<token> (the format
 * trem.API writes). The token leaves the address bar and the history at once and stays
 * only in memory until it is used.
 */
export type EmailLinkKind = 'verify-email' | 'reset-password'

const pending: Partial<Record<EmailLinkKind, string>> = {}

export function captureEmailLink(): EmailLinkKind | null {
  const match = /^#(verify-email|reset-password)=([\w-]{20,100})$/.exec(window.location.hash)
  if (!match) return null
  const kind = match[1] as EmailLinkKind
  pending[kind] = match[2]
  history.replaceState(history.state, '', window.location.pathname + window.location.search)
  return kind
}

export function peekEmailToken(kind: EmailLinkKind): string | undefined {
  return pending[kind]
}

export function clearEmailToken(kind: EmailLinkKind): void {
  delete pending[kind]
}
