import { authRequest } from './session'

export interface Me {
  id: string
  username: string
  email: string | null
  status: string
  permissions: string[]
}

export const authApi = {
  me: () => authRequest<Me>('/me'),
}
