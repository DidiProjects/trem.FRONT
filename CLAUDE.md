# trem.FRONT

React + Vite + MUI 9. Login (trem.API), catálogo dos serviços do servidor e a administração
dele; o catálogo vem da trem.API (`/hub/services`, `/admin/hub/services`). Dev server na
3004; o front chama a trem.API direto em `VITE_API_URL` (outro domínio, com CORS).

Regras gerais (autonomia, commits, testes, comentários) vivem em `~/.claude/`. Aqui só o
que é armadilha **deste** repositório.

## Armadilhas medidas

- **MUI 9 não aceita system props.** `alignItems`, `textAlign`, `flexWrap`, `maxWidth`
  etc. como prop de `Stack`/`Typography` dão erro de tipo ("No overload matches this
  call"): vão no `sx`.
- **O React Compiler (eslint-plugin-react-hooks 7) recusa setState síncrono em effect**,
  inclusive dentro de uma função chamada pelo effect e que só faz setState depois de um
  `await`. Ler o estado numa função pura e aplicar no `.then` (ver `AuthProvider`).
- **`AuthContext.tsx` e `authContext.ts` não podem coexistir:** no Windows o TypeScript
  acusa conflito de maiúsculas. Por isso o provider é `AuthProvider.tsx`.
- **Node 22.14 local:** react-router 8 pede Node ≥ 22.22 e jsdom 30+ também. Ficamos no
  react-router 7 e no jsdom 29. TypeScript fica no 6.0 porque o typescript-eslint
  ainda não aceita o 7.
- **Sem proxy de provedor.** O front fala com a trem.API no domínio dela: `fetch` com
  `credentials: 'include'` (senão o cookie de sessão nem é gravado) e a origem do front em
  `CORS_ORIGINS` da trem.API. Em produção o cookie é `SameSite=None; Partitioned`; em dev
  (HTTP) é `Strict`, por isso `localhost` nos dois lados, nunca `127.0.0.1` de um e
  `localhost` do outro: viram sites diferentes e o cookie não vai.
- **Refresh nunca em paralelo.** A trem.API trata refresh token reapresentado como
  roubo e derruba o login. Toda renovação passa por `refresh()` de `session.ts`.
- **A 1Password do Chrome intercepta digitação** nos campos de login durante testes com a
  extensão do Chrome: usar `form_input` em vez de `type`.

- **Dados da API num componente: `useLoad`** (`src/hooks/useLoad.ts`). Ele só faz setState
  no `.then`, o que a regra do React Compiler aceita; não chamar setState síncrono em effect.

## Testes

`npm run test:run` (Vitest + Testing Library, renderizando com StrictMode). A API é
simulada por `src/test/fakeApi.ts`, que já responde `GET /hub/services` com `CATALOG`.
Timeout de 15 s: o user-event digita tecla a tecla, e os formulários longos passam de 5 s
com os arquivos rodando em paralelo. `npm run build` roda `tsc -b` antes do bundle.
