import { describe, expect, it } from 'vitest'
import { fromKeywords, parseQuery, toQuery } from './terms'

describe('search expressions', () => {
  it('joins a group with OR and groups with AND, quoting phrases', () => {
    expect(toQuery([['React', 'front end'], ['hiring'], ['London', 'United Kingdom']])).toBe(
      '(React OR "front end") AND hiring AND (London OR "United Kingdom")',
    )
  })

  it('leaves out empty terms and empty groups', () => {
    expect(toQuery([['', ' react '], [''], []])).toBe('react')
    expect(toQuery([['']])).toBe('')
  })

  it('keeps a term with its own operators as written', () => {
    expect(toQuery([['"React Native" OR Flutter'], ['hiring']])).toBe('"React Native" OR Flutter AND hiring')
  })

  it('reads back what it builds', () => {
    const groups = [['React', 'front end'], ['hiring'], ['London', 'United Kingdom']]
    expect(parseQuery(toQuery(groups))).toEqual(groups)
  })

  it('keeps an expression it cannot split as one term', () => {
    expect(parseQuery('(React OR (Vue AND Nuxt)) NOT senior')).toEqual([['(React OR (Vue AND Nuxt)) NOT senior']])
    expect(parseQuery('"React" AND (unbalanced')).toEqual([['"React" AND (unbalanced']])
  })

  it('opens the searches saved one per line as alternatives of one group', () => {
    expect(fromKeywords(['react', 'front end', 'typescript'])).toEqual([['react', 'front end', 'typescript']])
    expect(fromKeywords(['"React" AND "TypeScript"'])).toEqual([['React'], ['TypeScript']])
    expect(fromKeywords([])).toEqual([['']])
  })
})
