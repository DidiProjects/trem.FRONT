import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Box, IconButton, Link, Stack, Typography } from '@mui/material'
import Close from '@mui/icons-material/Close'
import ChevronRight from '@mui/icons-material/ChevronRight'
import { FileDrop } from '@/components/FileDrop'
import { PageHeader } from '@/components/PageHeader'
import { ServiceGrid } from '@/components/ServiceGrid'
import { useAuth } from '@/hooks/useAuth'
import { GroupBadge } from '@/products/GroupBadge'
import { GroupScope } from '@/products/GroupScope'
import { groupVars } from '@/products/groupVars'
import { handoff } from '@/products/handoff'
import { recent } from '@/products/recent'
import { groupsFor, locate, toolsForFile, toolsOf } from '@/products/registry'
import type { ProductGroup } from '@/products/types'
import { formatBytes } from '@/utils/text'

const SECTION_GAP = 5

export function HomePage() {
  const { user } = useAuth()
  const groups = groupsFor(user?.permissions)
  const [dropped, setDropped] = useState<File | null>(null)

  return (
    <Stack spacing={SECTION_GAP}>
      <Box>
        <PageHeader
          title={`Olá, ${user?.username ?? ''}`}
          subtitle={groups.length ? 'Solte um arquivo e eu mostro o que dá para fazer com ele.' : 'Serviços do servidor liberados para a sua conta.'}
        />
        {groups.length > 0 && (dropped ? <Suggestions file={dropped} groups={groups} onClear={() => setDropped(null)} /> : (
          <FileDrop
            compact
            title="Solte aqui um PDF, imagem, áudio ou vídeo"
            hint="Ou escolha um arquivo. Ele só sai do seu computador quando você escolher a ferramenta."
            onFiles={([file]) => setDropped(file)}
          />
        ))}
      </Box>

      {user && <Recent userId={user.id} groups={groups} />}

      {groups.length > 0 && (
        <Box component="section" aria-labelledby="home-products">
          <Typography id="home-products" variant="h2">
            Produtos
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Ferramentas do trem. Rodam aqui mesmo, com o seu login.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </Box>
        </Box>
      )}

      <Box component="section" aria-labelledby="home-services" sx={{ border: 1, borderColor: 'divider', borderRadius: '24px', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography id="home-services" variant="h2">
              Serviços do servidor
            </Typography>
            <Typography color="text.secondary">Apps separados, cada um com o próprio login. Abrem em outra aba.</Typography>
          </Box>
          <Link component={RouterLink} to="/servicos" sx={{ fontWeight: 700 }}>
            Ver todos os serviços
          </Link>
        </Box>
        <ServiceGrid />
      </Box>
    </Stack>
  )
}

function GroupCard({ group }: { group: ProductGroup }) {
  const tools = toolsOf(group)
  return (
    <GroupScope group={group} component="article" aria-labelledby={`group-${group.id}`} sx={{ borderRadius: '24px', overflow: 'hidden', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
      <Box
        component={RouterLink}
        to={group.path}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'var(--group)', color: 'var(--on-group)', textDecoration: 'none' }}
      >
        <GroupBadge group={group} size={40} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography id={`group-${group.id}`} component="h3" sx={{ fontWeight: 800, fontSize: 18 }}>
            {group.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.85 }}>
            {tools.length === 1 ? '1 ferramenta' : `${tools.length} ferramentas`}
          </Typography>
        </Box>
        <ChevronRight aria-hidden />
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 1 }}>
        {tools.slice(0, 4).map((tool) => (
          <li key={tool.id}>
            <Box
              component={RouterLink}
              to={tool.path}
              sx={{ display: 'block', px: 1.5, py: 1.25, borderRadius: '12px', color: 'text.primary', textDecoration: 'none', fontWeight: 700, '&:hover': { bgcolor: 'action.hover' } }}
            >
              {tool.label}
            </Box>
          </li>
        ))}
        {tools.length > 4 && (
          <li>
            <Box component={RouterLink} to={group.path} sx={{ display: 'block', px: 1.5, py: 1.25, color: 'var(--group)', fontWeight: 700 }}>
              Ver todas as {tools.length}
            </Box>
          </li>
        )}
      </Box>
    </GroupScope>
  )
}

function Suggestions({ file, groups, onClear }: { file: File; groups: ProductGroup[]; onClear: () => void }) {
  const options = toolsForFile(file, groups)
  return (
    <Box role="region" aria-live="polite" aria-label="Sugestões para o arquivo" sx={{ borderRadius: '24px', bgcolor: 'background.paper', p: { xs: 2, sm: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, flexGrow: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          {file.name}{' '}
          <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>
            · {formatBytes(file.size)}
          </Typography>
        </Typography>
        <IconButton aria-label="Descartar arquivo" onClick={onClear}>
          <Close />
        </IconButton>
      </Box>
      {options.length ? (
        <>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>O que você quer fazer?</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
            {options.map(({ group, tool }) => (
              <Box
                key={tool.id}
                component={RouterLink}
                to={tool.path}
                onClick={() => handoff.give(tool.path, [file])}
                sx={[
                  groupVars(group),
                  {
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1.75,
                    borderRadius: '16px',
                    bgcolor: 'var(--group-soft)',
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover': { outline: '2px solid var(--group)' },
                  },
                ]}
              >
                <Typography component="span" sx={{ fontWeight: 800 }}>
                  {tool.suggestion ?? tool.label}
                </Typography>
                <Typography component="span" variant="body2" sx={{ color: 'var(--group)', fontWeight: 700 }}>
                  {group.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      ) : (
        <Typography color="text.secondary">Nenhuma ferramenta liberada para a sua conta abre esse tipo de arquivo.</Typography>
      )}
    </Box>
  )
}

function Recent({ userId, groups }: { userId: string; groups: ProductGroup[] }) {
  const allowed = new Set(groups.map((g) => g.id))
  const entries = recent
    .list(userId)
    .map((e) => ({ ...e, ...locate(e.path) }))
    .filter((e) => e.tool && e.group && allowed.has(e.group.id))
  if (!entries.length) return null
  return (
    <Box component="section" aria-labelledby="home-recent">
      <Typography id="home-recent" variant="h2" sx={{ mb: 1.5 }}>
        Usadas por último
      </Typography>
      <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
        {entries.map(({ path, group, tool, at }) => (
          <Box
            key={path}
            component={RouterLink}
            to={path}
            sx={[groupVars(group!), { display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', bgcolor: 'background.paper', color: 'text.primary', textDecoration: 'none', '&:hover': { outline: '2px solid var(--group)' } }]}
          >
            <GroupBadge group={group!} size={36} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{tool!.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
