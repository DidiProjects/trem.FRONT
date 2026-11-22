/**
 * LinkedIn post search expressions built from rows: the terms of a row must all appear (AND),
 * and any row is enough (OR). `[["React", "hiring"], ["Vue", "hiring"]]` is
 * `(React AND hiring) OR (Vue AND hiring)`. One expression is one search on LinkedIn.
 *
 * Measured on LinkedIn on 2026-11-22: post search honours AND, OR, NOT, quotes and parentheses,
 * and stops reading after 6 terms, whatever their length. Job search ignores the operators (it is
 * an AI search that returns similar jobs), so job terms stay plain text.
 */
export type Rows = string[][]

/** The terms LinkedIn post search reads in one expression; the 7th and later are dropped. */
export const MAX_TERMS = 6
/** linkedinho's limit for one search term (jobconfig.py). */
export const MAX_QUERY = 300

const OPERATOR = /\b(AND|OR|NOT)\b|[()"]/

function quoted(term: string): string {
  // A phrase is searched as typed only between quotes; terms with operators go as written.
  return /\s/.test(term) && !OPERATOR.test(term) ? `"${term}"` : term
}

const clean = (rows: Rows) => rows.map((r) => r.map((t) => t.trim()).filter(Boolean)).filter((r) => r.length)

export function termCount(rows: Rows): number {
  return clean(rows).reduce((n, r) => n + r.length, 0)
}

export function toQuery(rows: Rows): string {
  const filled = clean(rows).map((r) => r.map(quoted))
  return filled.map((r) => (r.length > 1 && filled.length > 1 ? `(${r.join(' AND ')})` : r.join(' AND '))).join(' OR ')
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

const unwrap = (s: string) => (s.startsWith('(') && s.endsWith(')') && splitTop(s.slice(1, -1), 'AND') ? s.slice(1, -1).trim() : s)
const unquote = (s: string) => (/^"[^"]+"$/.test(s) ? s.slice(1, -1) : s)

/** Reads an expression back into rows; anything it cannot read stays as one term, as written. */
export function parseQuery(query: string): Rows {
  const ors = splitTop(query.trim(), 'OR')
  if (!ors) return [[query.trim()]]
  const rows: Rows = []
  for (const part of ors) {
    const ands = splitTop(unwrap(part), 'AND')
    if (!ands || ands.some((t) => /[()]|\bNOT\b|\bOR\b/.test(t))) return [[query.trim()]]
    rows.push(ands.map(unquote))
  }
  return rows
}

/**
 * A saved search into rows. Several entries (each one its own search, as the form used to save
 * them) become one row each: any of them matches, as before, in a single search.
 */
export function fromKeywords(keywords: string[]): Rows {
  if (!keywords.length) return [['']]
  if (keywords.length === 1) return parseQuery(keywords[0])
  return keywords.map((k) => [unquote(k)])
}
