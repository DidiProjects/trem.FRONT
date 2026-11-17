export const env = {
  servicesHost: (import.meta.env.VITE_SERVICES_HOST ?? '').trim(),
  servicesProtocol: import.meta.env.VITE_SERVICES_PROTOCOL === 'https' ? 'https' : 'http',
}
