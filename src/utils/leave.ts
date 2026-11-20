/** Leaves the app for another site (a service's login callback): a full navigation, not a route. */
export function leaveTo(url: string) {
  window.location.assign(url)
}
