import { describe, expect, it } from 'vitest'
import { catalogFor } from '@/constants/services'
import { captureEmailLink, clearEmailToken, peekEmailToken } from './emailLinks'
import { newPasswordSchema, passwordIssue, registerSchema, validate } from './validation'

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

describe('catalog', () => {
  it('lists only the services granted with hub:<id>', () => {
    const services = catalogFor(['hub:radarr', 'trem:admin', 'hub:unknown'], '100.64.0.1', 'http')
    expect(services.map((s) => [s.id, s.url])).toEqual([['radarr', 'http://100.64.0.1:7878']])
  })

  it('has no address without a host', () => {
    expect(catalogFor(['hub:sonarr'], '', 'http')[0].url).toBe('')
  })
})
