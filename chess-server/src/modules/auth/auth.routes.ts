import type { FastifyInstance } from 'fastify'
import { register, login, refresh, logout, me } from './auth.controller.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/refresh', refresh)
  app.post('/auth/logout', logout)
  app.get('/auth/me', me)
}