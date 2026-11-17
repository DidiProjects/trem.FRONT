export const ADMIN_PERMISSION = 'trem:admin'

export function isAdmin(permissions: string[] | undefined): boolean {
  return Boolean(permissions?.includes(ADMIN_PERMISSION))
}
