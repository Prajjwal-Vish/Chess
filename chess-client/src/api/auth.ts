import { apiRequest } from './client'

export interface AuthUser {
  id: string
  username: string
  email: string
  rating: number
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: data }),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),

  me: (token: string) =>
    apiRequest<{ user: AuthUser }>('/auth/me', { token }),
}