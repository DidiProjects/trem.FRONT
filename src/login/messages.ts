// The flow is asked in pt-BR, but some messages still come in English (or in authentik's own
// wording): the ones a login can show, in the words of the rest of trem.FRONT.
const KNOWN: [RegExp, string][] = [
  [/^failed to authenticate|^falha na autentica/i, 'Usuário ou senha incorretos.'],
  [/^invalid password/i, 'Senha incorreta.'],
  [/^(invalid|incorrect) (code|token)|^code does not match/i, 'Código inválido. Confira o app autenticador e tente de novo.'],
  [/^this field is required/i, 'Preencha este campo.'],
  [/^request has been denied/i, 'Esta conta não tem acesso a este serviço.'],
  [/^too many (failed )?(login )?attempts|^too many requests/i, 'Muitas tentativas. Espere alguns minutos e tente de novo.'],
  [/^username is already taken/i, 'Este nome já está em uso. Escolha outro.'],
  [/^passwords don'?t match/i, 'As senhas não conferem.'],
  [/^password exists on/i, 'Esta senha aparece em vazamentos conhecidos. Escolha outra.'],
  [/^link was already used/i, 'Este link já foi usado. Se o e-mail já foi confirmado, é só entrar.'],
  [/^continue to confirm this email/i, 'Confirme o seu e-mail para ativar a conta.'],
]

export function translate(message: string | undefined): string | undefined {
  if (!message) return undefined
  return KNOWN.find(([pattern]) => pattern.test(message.trim()))?.[1] ?? message
}
