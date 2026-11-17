import { describe, expect, it } from 'vitest'
import { captureEmailLink, clearEmailToken, peekEmailToken } from './emailLinks'
import { logoIssue, newPasswordSchema, passwordIssue, registerSchema, serviceSchema, validate } from './validation'

const TOKEN = 'a'.repeat(43)

describe('password policy (mirrors trem.API)', () => {
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

describe('forms', () => {
  it('sign-up reports each field', () => {
    const errors = validate(registerSchema, { username: 'ab', email: 'nope', password: 'x', confirm: 'y' })
    expect(errors).toMatchObject({
      username: 'Mínimo de 3 caracteres',
      email: 'E-mail inválido',
      password: 'A senha deve ter no mínimo 12 caracteres',
      confirm: 'As senhas não conferem',
    })
  })

  it('a new password must differ from the current one', () => {
    const same = 'cavalo bateria grampo'
    const errors = validate(newPasswordSchema({ requireCurrent: true }), { current: same, password: same, confirm: same })
    expect(errors).toEqual({ password: 'A nova senha deve ser diferente da atual' })
  })
})

describe('e-mail links', () => {
  it('takes the token off the address and keeps it in memory', () => {
    window.history.replaceState(null, '', `/#reset-password=${TOKEN}`)

    expect(captureEmailLink()).toBe('reset-password')
    expect(window.location.hash).toBe('')
    expect(peekEmailToken('reset-password')).toBe(TOKEN)
    clearEmailToken('reset-password')
    expect(peekEmailToken('reset-password')).toBeUndefined()
  })

  it('ignores any other fragment', () => {
    window.history.replaceState(null, '', '/#something=else')
    expect(captureEmailLink()).toBeNull()
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
