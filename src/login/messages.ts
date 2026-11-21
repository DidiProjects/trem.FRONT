// The flow is asked in pt-BR, but some messages still come in English (or in authentik's own
// wording): the ones a login can show, in the words of the rest of trem.FRONT.
const KNOWN: [RegExp, string][] = [
  [/^failed to authenticate|^falha na autentica/i, 'Usuário ou senha incorretos.'],
  [/^invalid password/i, 'Senha incorreta.'],
  [/^(invalid|incorrect) (code|token)|^code does not match/i, 'Código inválido. Confira o app autenticador e tente de novo.'],
  [/^this field is required/i, 'Preencha este campo.'],
  [/^request has been denied/i, 'Esta conta não tem acesso a este serviço.'],
  [/^too many (failed )?(login )?attempts|^too many requests/i, 'Muitas tentativas. Espere alguns minutos e tente de novo.'],
]

export function translate(message: string | undefined): string | undefined {
  if (!message) return undefined
  return KNOWN.find(([pattern]) => pattern.test(message.trim()))?.[1] ?? message
}
