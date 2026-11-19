import type { SvgIconComponent } from '@mui/icons-material'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import AppsOutlined from '@mui/icons-material/AppsOutlined'
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined'
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import { FILE_EDITOR } from '@/products/registry'
import { isAdmin } from '@/utils/roles'

export interface PageLink {
  label: string
  path: string
  icon: SvgIconComponent
  keywords?: string
  /** Shown only when the account holds this permission. */
  permission?: string
  adminOnly?: boolean
}

/** Pages outside the product groups, in menu order. */
export const PAGES: PageLink[] = [
  { label: 'Início', path: '/', icon: HomeOutlined },
  { label: 'Serviços do servidor', path: '/servicos', icon: AppsOutlined, keywords: 'apps catalogo' },
  { label: 'Tarefas', path: '/tarefas', icon: TaskAltOutlined, keywords: 'andamento transcricao fila', permission: FILE_EDITOR },
]

export const TASKS_PATH = '/tarefas'

export const ACCOUNT_PAGES: PageLink[] = [
  { label: 'Minha conta', path: '/account', icon: ManageAccountsOutlined, keywords: 'perfil' },
]

/** Reachable from Ctrl K, not listed in the menu. */
export const SHORTCUTS: PageLink[] = [
  { label: 'Ligar a verificação em duas etapas', path: '/account/seguranca', icon: ManageAccountsOutlined, keywords: '2fa mfa totp autenticador senha seguranca' },
  { label: 'Criar chave de API', path: '/account/chaves', icon: ManageAccountsOutlined, keywords: 'token api key script' },
  { label: 'Falar com o administrador', path: '/account/feedback', icon: ManageAccountsOutlined, keywords: 'suporte ajuda feedback bug sugestao acesso' },
]

export const ADMIN_PAGES: PageLink[] = [
  {
    label: 'Catálogo de serviços',
    path: '/admin/services',
    icon: AdminPanelSettingsOutlined,
    keywords: 'administracao servicos',
    adminOnly: true,
  },
]

export function visible(links: PageLink[], permissions: readonly string[] | undefined): PageLink[] {
  return links.filter(
    (l) => (!l.adminOnly || isAdmin(permissions)) && (!l.permission || permissions?.includes(l.permission)),
  )
}
