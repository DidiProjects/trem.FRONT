import { PageHeader } from '@/components/PageHeader'
import { ServiceGrid } from '@/components/ServiceGrid'

export function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Serviços do servidor"
        subtitle="Apps separados do trem, cada um com o próprio login. Abrem em outra aba. Aparecem só os liberados para a sua conta."
      />
      <ServiceGrid />
    </>
  )
}
