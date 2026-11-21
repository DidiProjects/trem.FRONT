/** /if/flow/<slug>/ → <slug>: the address authentik sends the browser to. */
export function flowSlug(pathname: string): string {
  return pathname.match(/\/if\/flow\/([^/]+)/)?.[1] ?? 'default-authentication-flow'
}
