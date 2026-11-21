/** Full-page navigation out of the SPA; its own module so tests can replace it. */
export function leaveTo(url: string): void {
  window.location.assign(url)
}
