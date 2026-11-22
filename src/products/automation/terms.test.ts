import { describe, expect, it } from 'vitest'
import { fromKeywords, parseQuery, termCount, toQuery } from './terms'

describe('post search expressions', () => {
  it('joins a row with AND and rows with OR, quoting phrases', () => {
    expect(toQuery([['React', 'hiring', 'London'], ['front end', 'United Kingdom']])).toBe(
      '(React AND hiring AND London) OR ("front end" AND "United Kingdom")',
    )
  })

  it('needs no parentheses for one row or one-term rows', () => {
    expect(toQuery([['React', 'hiring']])).toBe('React AND hiring')
    expect(toQuery([['React'], ['Vue']])).toBe('React OR Vue')
  })

  it('leaves out empty terms and empty rows, and counts what is left', () => {
    const rows = [['', ' react '], [''], []]
    expect(toQuery(rows)).toBe('react')
    expect(termCount(rows)).toBe(1)
    expect(toQuery([['']])).toBe('')
  })

  it('reads back what it builds', () => {
    const rows = [['React', 'hiring', 'London'], ['front end', 'United Kingdom']]
    expect(parseQuery(toQuery(rows))).toEqual(rows)
  })

  it('keeps an expression it cannot split as one term', () => {
    expect(parseQuery('(React OR Vue) AND hiring')).toEqual([['(React OR Vue) AND hiring']])
    expect(parseQuery('react NOT senior')).toEqual([['react NOT senior']])
    expect(parseQuery('"React" AND (unbalanced')).toEqual([['"React" AND (unbalanced']])
  })

  it('opens the searches saved one per line as one row each', () => {
    expect(fromKeywords(['react', 'front end'])).toEqual([['react'], ['front end']])
    expect(fromKeywords(['"React" AND "TypeScript"'])).toEqual([['React', 'TypeScript']])
    expect(fromKeywords([])).toEqual([['']])
  })
})
