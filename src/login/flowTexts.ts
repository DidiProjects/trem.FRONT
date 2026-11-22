/** The words of each authentik flow the trem screen draws (trem.AUTH blueprints). */
export type FlowKind = 'login' | 'sign-up' | 'recovery'

export function flowKind(slug: string): FlowKind {
  if (slug === 'trem-enrollment') return 'sign-up'
  if (slug === 'trem-recovery') return 'recovery'
  return 'login'
}

interface FlowTexts {
  identify: { title: string; subtitle?: string; submit: string }
  emailSent: string[]
  link: { title: string; subtitle: string; submit: string }
  form: { title: string; subtitle: string; submit: string }
}

export const FLOW_TEXTS: Record<FlowKind, FlowTexts> = {
  login: {
    identify: { title: 'Entrar', submit: 'Entrar' },
    emailSent: [],
    link: { title: 'Entrar', subtitle: '', submit: 'Continuar' },
    form: { title: 'Entrar', subtitle: '', submit: 'Continuar' },
  },
  'sign-up': {
    identify: { title: 'Criar conta', submit: 'Continuar' },
    emailSent: [
      'Enviamos um link de confirmação para o seu e-mail. Ele vale por 24 horas.',
      'Não chegou? Confira a caixa de spam. Depois da confirmação, o administrador libera os serviços da sua conta.',
    ],
    link: { title: 'Confirmar e-mail', subtitle: 'Confirme o seu e-mail para ativar a conta.', submit: 'Confirmar e ativar a conta' },
    form: {
      title: 'Criar conta',
      subtitle: 'Depois de confirmar o e-mail, o administrador libera os serviços da sua conta.',
      submit: 'Criar conta',
    },
  },
  recovery: {
    identify: {
      title: 'Redefinir senha',
      subtitle: 'Informe seu usuário ou e-mail. Enviamos um link para criar uma senha nova.',
      submit: 'Enviar link',
    },
    emailSent: [
      'Se existir uma conta com esse usuário ou e-mail, enviamos um link para criar uma senha nova. Ele vale por 30 minutos.',
      'Não chegou? Confira a caixa de spam.',
    ],
    link: { title: 'Redefinir senha', subtitle: 'Continue para escolher a senha nova.', submit: 'Continuar' },
    form: { title: 'Senha nova', subtitle: 'Depois de salvar, entre com a senha nova.', submit: 'Salvar senha' },
  },
}
