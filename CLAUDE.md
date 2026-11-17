# trem.FRONT

React + Vite + MUI 9. Login (trem.API) e catálogo dos serviços do servidor. Dev server na
3004, com proxy de `/auth` e `/me` para a trem.API (ver `vite.config.ts`).

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
- **O cookie de sessão só funciona na mesma origem** (SameSite=Strict, path `/auth`). Em
  produção isso depende do proxy do Netlify (`scripts/write-redirects.mjs`): rota nova
  da trem.API chamada pelo front precisa entrar lá **e** no proxy do `vite.config.ts`.
- **Refresh nunca em paralelo.** A trem.API trata refresh token reapresentado como
  roubo e derruba o login. Toda renovação passa por `refresh()` de `session.ts`.
- **A 1Password do Chrome intercepta digitação** nos campos de login durante testes com a
  extensão do Chrome: usar `form_input` em vez de `type`.

## Testes

`npm run test:run` (Vitest + Testing Library, renderizando com StrictMode). A API é
simulada por `src/test/fakeApi.ts`. `npm run build` roda `tsc -b` antes do bundle.
