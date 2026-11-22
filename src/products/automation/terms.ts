/**
 * LinkedIn search expressions built from groups: the terms of a group are alternatives (OR),
 * and every group must match (AND). `[["React", "TypeScript"], ["hiring"]]` is
 * `(React OR TypeScript) AND hiring`. One expression is one search on LinkedIn.
 */
export type Groups = string[][]

/** linkedinho's limit for one search term (jobconfig.py). */
export const MAX_QUERY = 300

const OPERATOR = /\b(AND|OR|NOT)\b|[()"]/

function quoted(term: string): string {
  // A phrase is searched as typed only between quotes; terms with operators go as written.
  return /\s/.test(term) && !OPERATOR.test(term) ? `"${term}"` : term
}

export function toQuery(groups: Groups): string {
  return groups
    .map((g) => g.map((t) => t.trim()).filter(Boolean).map(quoted))
    .filter((g) => g.length)
    .map((g) => (g.length > 1 ? `(${g.join(' OR ')})` : g[0]))
    .join(' AND ')
}

/** Splits on the operator outside quotes and parentheses; null when they do not balance. */
function splitTop(text: string, op: 'AND' | 'OR'): string[] | null {
  const parts: string[] = []
  let depth = 0
  let quote = false
  let start = 0
  const sep = ` ${op} `
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') quote = !quote
    else if (!quote && c === '(') depth++
    else if (!quote && c === ')') depth--
    if (depth < 0) return null
    if (!quote && depth === 0 && text.startsWith(sep, i)) {
      parts.push(text.slice(start, i))
      start = i + sep.length
      i += sep.length - 1
    }
  }
  if (depth !== 0 || quote) return null
  parts.push(text.slice(start))
  return parts.map((p) => p.trim())
}

const unwrap = (s: string) => (s.startsWith('(') && s.endsWith(')') && splitTop(s.slice(1, -1), 'OR') ? s.slice(1, -1).trim() : s)
const unquote = (s: string) => (/^"[^"]+"$/.test(s) ? s.slice(1, -1) : s)

/** Reads an expression back into groups; anything it cannot read stays as one term, as written. */
export function parseQuery(query: string): Groups {
  const ands = splitTop(query.trim(), 'AND')
  if (!ands) return [[query.trim()]]
  const groups: Groups = []
  for (const part of ands) {
    const ors = splitTop(unwrap(part), 'OR')
    if (!ors || ors.some((t) => /[()]|\bNOT\b/.test(t))) return [[query.trim()]]
    groups.push(ors.map(unquote))
  }
  return groups
}

/**
 * A saved search into groups. Several entries (each one its own search, as the form used to save
 * them) become alternatives of one group: the same results in a single search.
 */
export function fromKeywords(keywords: string[]): Groups {
  if (!keywords.length) return [['']]
  if (keywords.length === 1) return parseQuery(keywords[0])
  return [keywords.map(unquote)]
}
