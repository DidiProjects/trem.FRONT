export interface AccessClaims {
  sub: string
  username: string
  exp: number
  must_change_password?: boolean
  amr?: string[]
}

/** Reads the payload without verifying it: only the API trusts the signature. */
export function readClaims(token: string): AccessClaims | null {
  try {
    const part = token.split('.')[1]
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as AccessClaims
  } catch {
    return null
  }
}
