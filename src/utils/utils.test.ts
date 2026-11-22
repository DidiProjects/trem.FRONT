import { describe, expect, it } from 'vitest'
import { logoIssue, passwordIssue, serviceSchema, validate } from './validation'

describe('password hints of the sign-up screen', () => {
  it.each([
    ['curta', 'A senha deve ter no mínimo 12 caracteres'],
    ['aaaaaaaaaaaaaaab', 'A senha repete caracteres demais'],
    ['x'.repeat(129), 'A senha deve ter no máximo 128 caracteres'],
  ])('refuses %s', (password, message) => {
    expect(passwordIssue(password)).toBe(message)
  })

  it('refuses the username or the e-mail name inside the password', () => {
    expect(passwordIssue('minha senha joana 1', 'joana')).toMatch(/nome de usuário/)
    expect(passwordIssue('minha senha jo.silva', 'ana', 'jo.silva@example.com')).toMatch(/nome de usuário/)
  })

  it('accepts a long passphrase', () => {
    expect(passwordIssue('cavalo bateria grampo')).toBeNull()
  })
})

describe('catalog service form (mirrors trem.API)', () => {
  const valid = { slug: 'immich', name: 'Immich', description: '', url: 'http://100.64.0.1:2283' }

  it('accepts an http(s) address or none', () => {
    expect(validate(serviceSchema, valid)).toBeNull()
    expect(validate(serviceSchema, { ...valid, url: '' })).toBeNull()
    expect(validate(serviceSchema, { ...valid, url: 'https://fotos.example.com/app' })).toBeNull()
  })

  it.each([
    ['ftp://host', 'Use um endereço http:// ou https://'],
    ['javascript:alert(1)', 'Use um endereço http:// ou https://'],
    ['http://u:p@host', 'O endereço não pode levar usuário ou senha'],
    ['100.64.0.1:2283', 'Endereço inválido. Ex.: http://100.64.0.1:2283'],
    ['nada', 'Endereço inválido. Ex.: http://100.64.0.1:2283'],
  ])('refuses the address %s', (url, message) => {
    expect(validate(serviceSchema, { ...valid, url })?.url).toBe(message)
  })

  it('takes the identifier the permission hub:<slug> accepts', () => {
    expect(validate(serviceSchema, { ...valid, slug: 'Immich' })?.slug).toMatch(/minúsculas/)
    expect(validate(serviceSchema, { ...valid, slug: '-x' })?.slug).toMatch(/minúsculas/)
    expect(validate(serviceSchema, { ...valid, slug: 'q.bit_torrent-2' })).toBeNull()
  })

  it('takes PNG, WebP or SVG logos up to 256 KB', () => {
    const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'logo', { type })
    expect(logoIssue(file('image/svg+xml'))).toBeNull()
    expect(logoIssue(file('image/gif'))).toBe('Use uma imagem PNG, WebP ou SVG')
    expect(logoIssue(file('image/png', 256 * 1024 + 1))).toBe('A imagem passa de 256 KB')
  })
})
