# trem.FRONT

React + Vite + MUI 9. Login (trem.API), os **produtos** (ferramentas da trem.API, por grupo
e permissão, em `src/products/`), os **serviços** do servidor (catálogo de `/hub/services`)
e a administração de aplicações, chaves e do catálogo (as contas ficam no authentik). Dev server na
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

- **`npm install` no Windows apaga `@emnapi/core` e `@emnapi/runtime` do lockfile** e o
  `npm ci` do CI (Linux) recusa. Ao adicionar dependência: partir do lockfile do commit
  anterior e acrescentar só a entrada nova e a linha em `packages[""]`.
- **trem.API não expõe `Content-Disposition` nem os `X-*` para outra origem** (CORS
  `expose_headers` só tem `Retry-After`): o nome do arquivo baixado é montado no front, e a
  compressão de imagem pede `response_type=json` para ler os tamanhos.
- **Diálogo do MUI renderiza em portal**, fora do `GroupScope`: `var(--group)` some. Passar
  `groupVars(grupo)` no `slotProps.paper.sx`.
- **`borderRadius` numérico no `sx` multiplica `shape.borderRadius` (16)**: `borderRadius: 3`
  vira 48 px. Usar string em px.
- **Produto novo**: entra em `src/products/<grupo>/index.ts` com a página em `lazy()`; rota,
  menu, Ctrl K e Home saem do registro. Página importada direto cria ciclo com
  `registry.ts`.

- **Dados da API num componente: `useLoad`** (`src/hooks/useLoad.ts`). Ele só faz setState
  no `.then`, o que a regra do React Compiler aceita; não chamar setState síncrono em effect.

## Testes

`npm run test:run` (Vitest + Testing Library, renderizando com StrictMode). A API é
simulada por `src/test/fakeApi.ts`, que já responde `GET /hub/services` com `CATALOG`.
Timeout de 15 s: o user-event digita tecla a tecla, e os formulários longos passam de 5 s
com os arquivos rodando em paralelo. O `findBy` espera 5 s (`setup.ts`): as páginas de
ferramenta são `lazy` e o primeiro import passa de 1 s em paralelo. `src/test/app.tsx` tem
`openAt`, `loggedIn(...permissões)` e `binary()`: resposta binária precisa de string no
`Response`, porque o `Blob` do jsdom não é aceito pelo `Response` do Node. `npm run build` roda `tsc -b` antes do bundle.
