import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Box, Dialog, InputBase, Typography } from '@mui/material'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import OpenInNew from '@mui/icons-material/OpenInNew'
import { useCatalog } from '@/contexts/catalogContext'
import { useAuth } from '@/hooks/useAuth'
import { groupVars } from '@/products/groupVars'
import { groupsFor, toolsOf } from '@/products/registry'
import type { ProductGroup } from '@/products/types'
import { fold } from '@/utils/text'
import { ACCOUNT_PAGES, ADMIN_PAGES, PAGES, SHORTCUTS, visible } from './links'

interface Item {
  id: string
  label: string
  detail: string
  /** Internal route, or an external address when `external`. */
  to: string
  external?: boolean
  group?: ProductGroup
  words: string
}

interface Section {
  title: string
  items: Item[]
}

function useSections(): Section[] {
  const { user } = useAuth()
  const catalog = useCatalog()
  const services = catalog.result.state === 'ready' ? catalog.result.data : null
  const permissions = user?.permissions

  return useMemo(() => {
    const products: Item[] = groupsFor(permissions).flatMap((group) => [
      { id: group.path, label: group.label, detail: 'Produto', to: group.path, group, words: `${group.label} ${group.summary}` },
      ...toolsOf(group).map((tool) => ({
        id: tool.path,
        label: tool.label,
        detail: group.label,
        to: tool.path,
        group,
        words: `${tool.label} ${group.label} ${tool.description} ${tool.keywords ?? ''}`,
      })),
    ])
    const servers: Item[] = (services ?? []).map((s) => ({
      id: `service:${s.slug}`,
      label: s.name,
      detail: 'Serviço · abre em nova aba',
      to: s.url,
      external: true,
      words: `${s.name} ${s.slug} ${s.description ?? ''}`,
    }))
    const pages: Item[] = visible([...PAGES, ...ACCOUNT_PAGES, ...ADMIN_PAGES], permissions).map((p) => ({
      id: p.path,
      label: p.label,
      detail: p.adminOnly ? 'Administração' : 'Página',
      to: p.path,
      words: `${p.label} ${p.keywords ?? ''}`,
    }))
    const actions: Item[] = visible(SHORTCUTS, permissions).map((p) => ({
      id: `action:${p.label}`,
      label: p.label,
      detail: 'Ação',
      to: p.path,
      words: `${p.label} ${p.keywords ?? ''}`,
    }))
    return [
      { title: 'Produtos', items: products },
      { title: 'Serviços', items: servers },
      { title: 'Páginas', items: pages },
      { title: 'Ações', items: actions },
    ]
  }, [permissions, services])
}

function filter(sections: Section[], query: string): Section[] {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return sections.filter((s) => s.items.length)
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => terms.every((t) => fold(i.words).includes(t))) }))
    .filter((s) => s.items.length)
}

interface Props {
  open: boolean
  onClose: () => void
}

/** Ctrl K: jump to any product, service or page the account can open. */
export function CommandPalette({ open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label="Buscar ou ir para"
      slotProps={{ paper: { sx: { alignSelf: 'flex-start', mt: { xs: 2, sm: '10vh' }, borderRadius: '24px', overflow: 'hidden' } } }}
    >
      {open && <Palette onClose={onClose} />}
    </Dialog>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const listId = useId()
  const sections = useSections()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const shown = filter(sections, query)
  const flat = shown.flatMap((s) => s.items)
  const current = flat[Math.min(active, flat.length - 1)]
  const optionId = (item: Item) => `${listId}-${item.id.replace(/[^\w-]/g, '_')}`

  const go = (item: Item, newTab = false) => {
    onClose()
    if (item.external || newTab) window.open(item.to, '_blank', 'noopener,noreferrer')
    else navigate(item.to)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (flat.length ? (Math.min(i, flat.length - 1) + step + flat.length) % flat.length : 0))
    } else if (event.key === 'Enter' && current) {
      event.preventDefault()
      go(current, event.ctrlKey || event.metaKey)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SearchOutlined sx={{ color: 'text.secondary' }} aria-hidden />
        <InputBase
          autoFocus
          fullWidth
          placeholder="O que você quer fazer?"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          slotProps={{
            input: {
              role: 'combobox',
              'aria-label': 'Buscar produto, serviço ou página',
              'aria-expanded': true,
              'aria-controls': listId,
              'aria-autocomplete': 'list',
              'aria-activedescendant': current ? optionId(current) : undefined,
            },
          }}
          sx={{ fontSize: 18, fontWeight: 700, py: 0.5 }}
        />
        <Box component="kbd" sx={{ font: 'inherit', fontSize: 12, fontWeight: 700, color: 'text.secondary', border: 1, borderColor: 'divider', borderRadius: '6px', px: 1 }}>
          Esc
        </Box>
      </Box>

      <Box id={listId} role="listbox" aria-label="Resultados" sx={{ maxHeight: '60vh', overflowY: 'auto', p: 1 }}>
        {shown.map((section) => (
          <Box key={section.title} role="group" aria-label={section.title} sx={{ pb: 1 }}>
            <Typography aria-hidden sx={{ px: 1.5, pt: 1, pb: 0.5, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
              {section.title}
            </Typography>
            {section.items.map((item) => {
              const selected = item === current
              return (
                <Box
                  key={item.id}
                  id={optionId(item)}
                  role="option"
                  aria-selected={selected}
                  onClick={() => go(item)}
                  onMouseMove={() => setActive(flat.indexOf(item))}
                  sx={[
                    item.group ? groupVars(item.group) : {},
                    {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      minHeight: 44,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      bgcolor: selected ? 'action.selected' : 'transparent',
                    },
                  ]}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '3px',
                      flexShrink: 0,
                      bgcolor: item.group ? 'var(--group)' : 'text.secondary',
                    }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.detail}
                    </Typography>
                  </Box>
                  {item.external ? (
                    <OpenInNew fontSize="small" sx={{ color: 'text.secondary' }} aria-hidden />
                  ) : (
                    <Typography component="code" variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', display: { xs: 'none', sm: 'block' } }}>
                      {item.to}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        ))}
        {flat.length === 0 && (
          <Typography role="status" sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            Nada encontrado para “{query}”.
          </Typography>
        )}
      </Box>

      <Box aria-hidden sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, px: 2.5, py: 1.25, borderTop: 1, borderColor: 'divider', color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>
        <span>↑ ↓ navegar</span>
        <span>Enter abrir</span>
        <span>Ctrl Enter nova aba</span>
      </Box>
    </Box>
  )
}
