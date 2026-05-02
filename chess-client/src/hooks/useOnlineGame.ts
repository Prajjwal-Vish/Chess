import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import { getSocket, disconnectSocket } from '../socket'
import { useAuthStore } from '../stores/authStore'

const EVENTS = {
  INIT_GAME: 'init_game',
  MOVE: 'move',
  RESIGN: 'resign',
  GAME_INIT: 'game_init',
  MOVE_MADE: 'move_made',
  GAME_OVER: 'game_over',
  GAME_ERROR: 'game_error',
  WAITING: 'waiting',
} as const

export type OnlineStatus = 'idle' | 'waiting' | 'playing' | 'over'

export interface OnlineGameState {
  status: OnlineStatus
  color: 'white' | 'black'
  gameId: string | null
  fen: string
  turn: 'white' | 'black'
  isCheck: boolean
  lastMove: [Key, Key] | undefined
  dests: Map<Key, Key[]>
  moves: { san: string; fen: string; color: 'w' | 'b' }[]
  winner: 'white' | 'black' | 'draw' | null
  endReason: string | null
  error: string | null
}

function getDestinations(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  for (const sq of chess.board().flat()) {
    if (!sq) continue
    const moves = chess.moves({ square: sq.square, verbose: true })
    if (moves.length) dests.set(sq.square as Key, moves.map((m) => m.to as Key))
  }
  return dests
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function useOnlineGame() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const chessRef = useRef(new Chess())
  // Ref so socket event handlers always see the current color without stale closures
  const colorRef = useRef<'white' | 'black'>('white')

  const [state, setState] = useState<OnlineGameState>({
    status: 'idle',
    color: 'white',
    gameId: null,
    fen: INITIAL_FEN,
    turn: 'white',
    isCheck: false,
    lastMove: undefined,
    dests: new Map(),
    moves: [],
    winner: null,
    endReason: null,
    error: null,
  })

  // Disconnect socket on unmount
  useEffect(() => {
    return () => disconnectSocket()
  }, [])

  const joinMatchmaking = useCallback(() => {
    if (!accessToken) return
    const socket = getSocket(accessToken)

    socket.off() // remove any stale handlers from a previous session
    socket.connect()

    socket.on('connect_error', (err) => {
      const msg = err.message.toLowerCase().includes('unauthorized')
        ? 'Session expired — please log out and log back in.'
        : `Connection failed: ${err.message}`
      setState((s) => ({ ...s, status: 'idle', error: msg }))
    })

    socket.on(EVENTS.WAITING, () => {
      setState((s) => ({ ...s, status: 'waiting' }))
    })

    socket.on(
      EVENTS.GAME_INIT,
      ({ color, gameId }: { color: 'white' | 'black'; gameId: string }) => {
        colorRef.current = color
        const chess = new Chess()
        chessRef.current = chess
        const isMyTurn = color === 'white' // white always moves first
        setState((s) => ({
          ...s,
          status: 'playing',
          color,
          gameId,
          fen: INITIAL_FEN,
          turn: 'white',
          isCheck: false,
          lastMove: undefined,
          dests: isMyTurn ? getDestinations(chess) : new Map(),
          moves: [],
          winner: null,
          endReason: null,
          error: null,
        }))
      },
    )

    socket.on(
      EVENTS.MOVE_MADE,
      ({ from, to, san, fen }: { from: string; to: string; san: string; fen: string }) => {
        const chess = chessRef.current
        chess.load(fen)
        // The side that just moved is the opposite of whose turn it now is
        const movedColor = fen.split(' ')[1] === 'w' ? 'b' : 'w'
        const lastMove: [Key, Key] = [from as Key, to as Key]
        const myColor = colorRef.current
        const isMyTurn = chess.turn() === (myColor === 'white' ? 'w' : 'b')
        setState((s) => ({
          ...s,
          fen,
          turn: chess.turn() === 'w' ? 'white' : 'black',
          isCheck: chess.inCheck(),
          lastMove,
          dests: isMyTurn ? getDestinations(chess) : new Map(),
          moves: [...s.moves, { san, fen, color: movedColor as 'w' | 'b' }],
        }))
      },
    )

    socket.on(
      EVENTS.GAME_OVER,
      ({ winner, reason }: { winner: 'white' | 'black' | 'draw'; reason: string }) => {
        setState((s) => ({
          ...s,
          status: 'over',
          winner,
          endReason: reason,
          dests: new Map(),
        }))
      },
    )

    socket.on(EVENTS.GAME_ERROR, ({ message }: { message: string }) => {
      console.warn('[online game error]', message)
    })

    socket.emit(EVENTS.INIT_GAME)
    setState((s) => ({ ...s, status: 'waiting', error: null }))
  }, [accessToken])

  const makeMove = useCallback(
    (from: Key, to: Key): boolean => {
      if (!accessToken) return false
      const chess = chessRef.current

      let result
      try {
        result = chess.move({ from, to, promotion: 'q' })
      } catch {
        return false
      }
      if (!result) return false

      getSocket(accessToken).emit(EVENTS.MOVE, { from, to })

      const fen = chess.fen()
      const lastMove: [Key, Key] = [from, to]
      const myColor = colorRef.current
      const isMyTurn = chess.turn() === (myColor === 'white' ? 'w' : 'b')

      setState((s) => ({
        ...s,
        fen,
        turn: chess.turn() === 'w' ? 'white' : 'black',
        isCheck: chess.inCheck(),
        lastMove,
        dests: isMyTurn ? getDestinations(chess) : new Map(),
        moves: [...s.moves, { san: result.san, fen, color: result.color }],
      }))
      return true
    },
    [accessToken],
  )

  const resign = useCallback(() => {
    if (!accessToken) return
    getSocket(accessToken).emit(EVENTS.RESIGN)
  }, [accessToken])

  return { state, joinMatchmaking, makeMove, resign }
}
