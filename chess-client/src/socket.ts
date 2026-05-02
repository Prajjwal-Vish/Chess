import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket) {
    // websocket-only: skip polling so Fastify doesn't intercept
    // the /socket.io HTTP polling requests before engine.io handles them.
    socket = io('http://localhost:3001', {
      auth: { token },
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
