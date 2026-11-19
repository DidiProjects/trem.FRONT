import type { ReactNode } from 'react'
import { Box, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material'
import { groupVars } from '@/products/groupVars'
import { GROUPS } from '@/products/registry'
import type { Application } from '@/services/adminApi'
import type { ManagedService } from '@/services/hubApi'
import { permissionLabel } from '@/utils/permissions'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  applications: Application[]
  services: ManagedService[]
  disabled?: boolean
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
      <Typography component="legend" sx={{ fontWeight: 800, mb: 0.5 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {hint}
        </Typography>
      )}
      <FormGroup>{children}</FormGroup>
    </Box>
  )
}

/**
 * Everything an account can be granted, in the same split the user sees: products
 * of the trem, services of the server, other applications and administration.
 */
export function PermissionPicker({ value, onChange, applications, services, disabled }: Props) {
  const has = new Set(value)
  const toggle = (key: string, on: boolean) => onChange(on ? [...value, key] : value.filter((k) => k !== key))
  const box = (key: string, label: ReactNode) => (
    <FormControlLabel key={key} disabled={disabled} label={label} control={<Checkbox checked={has.has(key)} onChange={(e) => toggle(key, e.target.checked)} />} />
  )

  const trem = applications.find((a) => a.slug === 'trem')?.permissions ?? []
  const hub = applications.find((a) => a.slug === 'hub')?.permissions ?? []
  const others = applications.filter((a) => a.slug !== 'trem' && a.slug !== 'hub')
  const serviceName = new Map(services.map((s) => [s.permission, s.name]))
  const productKeys = trem.map((p) => p.key).filter((k) => k !== 'trem:admin')

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Section title="Produtos" hint="Ferramentas do trem.">
        {productKeys.map((key) => {
          const groups = GROUPS.filter((g) => g.permission === key)
          return box(
            key,
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {groups.map((g) => (
                <Box key={g.id} component="span" aria-hidden sx={[groupVars(g), { width: 10, height: 10, borderRadius: '3px', bgcolor: 'var(--group)' }]} />
              ))}
              {permissionLabel(key)}
            </Box>,
          )
        })}
      </Section>
      {hub.length > 0 && (
        <Section title="Serviços do servidor" hint="Liberam o card no trem; o login em cada serviço continua sendo o dele.">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {hub.map((p) => box(p.key, serviceName.get(p.key) ?? p.name))}
          </Box>
        </Section>
      )}
      {others.map((a) => (
        <Section key={a.slug} title={a.name} hint={a.description ?? undefined}>
          {a.permissions.map((p) => box(p.key, p.description || p.name))}
        </Section>
      ))}
      {trem.some((p) => p.key === 'trem:admin') && <Section title="Administração">{box('trem:admin', 'Administrador do trem')}</Section>}
    </Box>
  )
}
