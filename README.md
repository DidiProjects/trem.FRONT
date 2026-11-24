# trem.FRONT

The trem's web app, on [trem.API](https://github.com/DidiProjects/trem.API): login, the
**products** (the API's own tools: PDF, images, audio and video, AI, LinkedIn automation),
the **services** of the server (Immich, Jellyfin, Radarr... each with its own login) and
the administration of accounts, permissions and keys.

React 19 · TypeScript · Vite 8 · MUI 9 · React Router 7 · Zod 4 · Vitest.

## Running

```bash
cp .env.example .env          # optional: VITE_API_URL
npm install
npm start                     # http://localhost:3004
```

The front calls trem.API directly at `VITE_API_URL` (default `http://localhost:3002`).
trem.API must list the front's origin in `CORS_ORIGINS` (`http://localhost:3004` in
development).

```bash
npm run lint
npm run test:run
npm run build
```

## Authentication

The login is authentik's (trem.AUTH): `/login` sends the browser there (authorization code +
PKCE, public client `trem`), `/auth/callback` trades the code for tokens, and every trem.API
call carries authentik's access token (trem.API checks it against the same issuer,
`AUTHENTIK_ISSUER`). Accounts, passwords, second factor, sign-up and approval all live in
authentik.

| Piece | Where |
|---|---|
| PKCE, code exchange, renewals, logout URL | `src/services/oidc.ts` |
| Session: access token in memory, renewal, tabs | `src/services/session.ts` |
| HTTP and error parsing (field errors, `Retry-After`) | `src/services/http.ts` |
| State for the pages | `src/contexts/AuthProvider.tsx`, `useAuth()` |
| Route guards | `src/routes/guards.tsx` |
| The login screen authentik shows (second build, `npm run build:login`) | `src/login/` |

- The access token stays in memory; the refresh token and id token live in
  `sessionStorage`, per tab, never sent to trem.API. A new tab goes through authentik
  again, which answers at once while its own session is alive.
- The access token is renewed a minute before it expires, when a tab comes back from the
  background, and once on any 401 (then the request is retried). Renewals are single
  flight in a tab and serialized across tabs with Web Locks.
- Logout ends authentik's session too (end-session) and never resolves, so `/login` cannot
  log the user straight back in. It reaches the other tabs through `BroadcastChannel`.
- Account security (password, second factor, sessions) links to authentik's own page.

## Products and services

Two kinds of things, kept apart in the menu, Home, Ctrl K and the admin:

- **Products** are tools of the trem, used here with the trem login. They come in groups,
  each with its route, color and the permission that unlocks it. The registry is
  `src/products/registry.ts`; each group lists its tools in `src/products/<group>/index.ts`.
- **Services** are separate apps of the server, opened in a new tab. They come from the
  catalog below.

| Group | Routes | Permission | trem.API |
|---|---|---|---|
| Documentos | `/documentos/*` (9 tools) | `trem:file_editor` | `/pdf/*` |
| Imagens | `/imagens/*` (3) | `trem:file_editor` | `/image/*` |
| Áudio e vídeo | `/midia/cortar`, `/midia/transcrever` | `trem:file_editor` | `/movie/*`, `/audio/*` |
| IA | `/ia/conversa` | `trem:ai` | `/llm/*` |
| Automação | `/automacoes/linkedin` | `trem:linkedin_scraper` | `/scrapers/linkedin/*` |

A group without its permission is not shown anywhere, and its routes explain how to ask
for it (trem.API checks the permission again on every call). Other pages: `/servicos`,
`/tarefas`, `/account/*` (profile, security link, API keys, feedback),
`/admin/aplicacoes/*`, `/admin/services`.

Navigation: a sidebar (a drawer below `md`), **Ctrl K** to jump to any product, service,
page or account action, and Home, which suggests the tools for a dropped file and lists
the tools used last. A produced file can go on to another tool without a new upload
(`src/products/handoff.ts`, memory only).

- File tools share `FileTool` (drop, options, run, download). Files are named by the front:
  trem.API does not expose `Content-Disposition` to other origins.
- Transcriptions go up in parts (Cloudflare drops requests above 100 MB) and are followed
  by a runner in the layout; `/tarefas` lists them. trem.API keeps jobs in memory, so a
  restart loses them and the page says so.
- Chat questions go as jobs (`/llm/jobs`), since a sleeping model takes minutes.
- Conversations, tasks and recent tools stay in this browser's `localStorage`, per account.

## Catalog

The services live in trem.API (`/hub/services`): name, description, address, logo and
order. The catalog shows what trem.API returns for the account: enabled services with an
address, granted with the permission `hub:<service>`.

### Administration

Accounts are managed in authentik (trem.AUTH), not here: sign-ups, approval, suspension and
what each account may use (its groups `trem:*` and `hub:*`, which the token carries).
`/admin/aplicacoes` manages
applications, their permissions and service keys (the personal keys are in Minha conta).
The catalog of services is `/admin/services`:

For accounts holding `trem:admin`, from the account menu ("Serviços do catálogo"). trem.API
also requires the login to have used the second factor (TOTP); without it the page says so.

- Create, edit, hide, reorder and remove services. The identifier becomes the permission
  `hub:<identifier>` and cannot change.
- Who sees a service: the members of the authentik group `hub:<identifier>`. Removing a
  service here leaves that group in authentik.
- Logo: PNG, WebP or SVG up to 256 KB, sent to trem.API and served from there.

The five initial services come from trem.API's migration 010 with their logos
([dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0) and no
address: fill it in the admin area for each to appear.

## Deploy (home server)

`.github/workflows/deploy.yml` runs on every push to `main`: lint and tests, then a Docker
image (`Dockerfile`: Vite build, served by unprivileged nginx on 8080 per `nginx.conf`) is
pushed to `ghcr.io/didiprojects/trem.front` and started on the server as `trem-front`,
read-only and bound to `127.0.0.1:13004`. The Cloudflare Tunnel publishes it as
`https://web.didilv93.com`. `VITE_*` are build-time values, so the image only works for
production; the Dockerfile refuses addresses that are not https.

nginx serves `index.html` for the client-side routes (revalidated on each visit, so a deploy
reaches open tabs on the next navigation) and caches `/assets/` for a year (hashed names).
The API is not proxied.

The app installs as a web app (`public/manifest.webmanifest`, icons in `public/`). There is
no service worker on purpose: nothing works offline, and a cached shell would outlive deploys.

Repository configuration:

| Kind | Name | Value |
|---|---|---|
| variable | `TREM_API_URL` | trem.API's origin, `https://api.didilv93.com` |
| variable | `OIDC_ISSUER` | required: authentik's `trem` provider, `https://auth.didilv93.com/application/o/trem/` |
| variable | `TAILSCALE_IP` | the server's Tailscale address (same as trem.API) |
| secret | `TAILSCALE_CLIENT_SECRET` | Tailscale auth key for the runner (same as trem.API) |
| secret | `SSH_PRIVATE_KEY` | SSH key for the server (same as trem.API) |

In trem.API: this site's origin in `CORS_ORIGINS`. In trem.AUTH: the `trem` provider's redirect URIs and the
post-login redirect point at this site.
