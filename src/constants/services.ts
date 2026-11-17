import immich from '@/assets/logos/immich.svg'
import radarr from '@/assets/logos/radarr.svg'
import qbittorrent from '@/assets/logos/qbittorrent.svg'
import prowlarr from '@/assets/logos/prowlarr.svg'
import sonarr from '@/assets/logos/sonarr.svg'
import { env } from '@/config/env'

/** trem.API application whose permissions ("hub:<id>") open each service in the catalog. */
export const HUB_APP = 'hub'

export interface ServiceDefinition {
  id: string
  name: string
  description: string
  logo: string
  port: number
}

export interface CatalogService extends ServiceDefinition {
  url: string
}

export const SERVICES: ServiceDefinition[] = [
  {
    id: 'immich',
    name: 'Immich',
    description: 'Fotos e vídeos: backup do celular, álbuns, busca por pessoas e lugares.',
    logo: immich,
    port: 2283,
  },
  {
    id: 'radarr',
    name: 'Radarr',
    description: 'Filmes: acompanha lançamentos e busca automaticamente na qualidade escolhida.',
    logo: radarr,
    port: 7878,
  },
  {
    id: 'sonarr',
    name: 'Sonarr',
    description: 'Séries: acompanha temporadas e baixa episódios novos assim que saem.',
    logo: sonarr,
    port: 8989,
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr',
    description: 'Indexadores: gerencia as fontes de busca usadas pelo Radarr e pelo Sonarr.',
    logo: prowlarr,
    port: 9696,
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Downloads: fila, velocidade e andamento dos torrents.',
    logo: qbittorrent,
    port: 8080,
  },
]

export function permissionFor(serviceId: string): string {
  return `${HUB_APP}:${serviceId}`
}

/** The services this account may open, with their address on the server. */
export function catalogFor(permissions: string[], host = env.servicesHost, protocol = env.servicesProtocol): CatalogService[] {
  const granted = new Set(permissions)
  return SERVICES.filter((s) => granted.has(permissionFor(s.id))).map((s) => ({
    ...s,
    url: host ? `${protocol}://${host}:${s.port}` : '',
  }))
}
