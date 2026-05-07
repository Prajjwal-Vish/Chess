import { useState, useEffect, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import type { Square } from 'chess.js'
import { getSocket, disconnectSocket } from '../socket'
import { useAuthStore } from '../stores/authStore'

const EVENTS = {
  INIT_GAME: 'init_game',
  RECONNECT_GAME: 'reconnect_game',
  MOVE: 'move',
  RESIGN: 'resign',
  FLAG: 'flag',
  GAME_INIT: 'game_init',
  MOVE_MADE: 'move_made',
  GAME_OVER: 'game_over',
  GAME_ERROR: 'game_error',
  WAITING: 'waiting',
} as const

export type OnlineStatus = 'idle' | 'waiting' | 'playing' | 'over'
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export const TIME_CONTROLS = ['1+0', '3+0', '5+0', '10+0', '15+10', '30+0'] as const
export type TimeControlOption = (typeof TIME_CONTROLS)[number]

export interface OnlineGameState {
  status: OnlineStatus
  reconnecting: boolean
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
  whiteUsername: string
  blackUsername: string
  whiteMs: number
  blackMs: number
  promotionPending: { from: Key; to: Key } | null
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

function isPawnPromotion(chess: Chess, from: string, to: string): boolean {
  const piece = chess.get(from as Square)
  if (!piece || piece.type !== 'p') return false
  return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')
}

function defaultMs(tc: string): number {
  const base = parseInt(tc.split('+')[0], 10) || 5
  return base * 60 * 1000
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const SESSION_KEY = 'chess-game-session'

export function useOnlineGame(initialTimeControl: TimeControlOption = '5+0') {
  const accessToken = useAuthStore((s) => s.accessToken)

  const [timeControl, setTimeControl] = useState<TimeControlOption>(initialTimeControl)
  const chessRef = useRef(new Chess())
  const colorRef = useRef<'white' | 'black'>('white')
  const promotionRef = useRef<{ from: Key; to: Key } | null>(null)
  const accessTokenRef = useRef(accessToken)
  const timeControlRef = useRef(timeControl)
  useEffect(() => { accessTokenRef.current = accessToken }, [accessToken])
  useEffect(() => { timeControlRef.current = timeControl }, [timeControl])

  const [state, setState] = useState<OnlineGameState>({
    status: 'idle',
    reconnecting: false,
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
    whiteUsername: '',
    blackUsername: '',
    whiteMs: defaultMs(initialTimeControl),
    blackMs: defaultMs(initialTimeControl),
    promotionPending: null,
  })

  useEffect(() => {
    return () => disconnectSocket()
  }, [])

  useEffect(() => {
    setState((s) => {
      if (s.status !== 'idle') return s
      const ms = defaultMs(timeControl)
      return { ...s, whiteMs: ms, blackMs: ms }
    })
  }, [timeControl])

  // Client-side countdown
  useEffect(() => {
    if (state.status !== 'playing') return
    const interval = setInterval(() => {
      setState((s) => {
        if (s.status !== 'playing' || s.promotionPending) return s
        if (s.turn === 'white') return { ...s, whiteMs: Math.max(0, s.whiteMs - 100) }
        return { ...s, blackMs: Math.max(0, s.blackMs - 100) }
      })
    }, 100)
    return () => clearInterval(interval)
  }, [state.status])

  // Auto-flag when own clock hits 0
  useEffect(() => {
    if (state.status !== 'playing') return
    const isMyTimeOut =
      (state.color === 'white' && state.whiteMs <= 0) ||
      (state.color === 'black' && state.blackMs <= 0)
    if (!isMyTimeOut) return
    const token = accessTokenRef.current
    if (token) getSocket(token).emit(EVENTS.FLAG)
  }, [state.whiteMs, state.blackMs, state.color, state.status])

  // Stable handler registration — all mutable state accessed via refs
  const applyHandlers = useCallback((socket: ReturnType<typeof getSocket>) => {
    socket.off()

    socket.on('connect_error', (err) => {
      const msg = err.message.toLowerCase().includes('unauthorized')
        ? 'Session expired — please log out and log back in.'
        : `Connection failed: ${err.message}`
      sessionStorage.removeItem(SESSION_KEY)
      setState((s) => ({ ...s, status: 'idle', reconnecting: false, error: msg }))
    })

    socket.on(EVENTS.WAITING, () => {
      setState((s) => ({ ...s, status: 'waiting' }))
    })

    socket.on(
      EVENTS.GAME_INIT,
      (data: {
        color: 'white' | 'black'
        gameId: string
        whiteUsername: string
        blackUsername: string
        whiteMs: number
        blackMs: number
        fen?: string
        moves?: { san: string; fen: string; color: string }[]
        turn?: 'white' | 'black'
        isCheck?: boolean
        lastMove?: [string, string] | null
      }) => {
        const { color, gameId, whiteUsername, blackUsername, whiteMs, blackMs,
                fen, moves, turn, isCheck, lastMove } = data
        colorRef.current = color
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ gameId }))

        const chess = new Chess()
        if (fen) chess.load(fen)
        chessRef.current = chess

        const currentTurn = turn ?? 'white'
        const isMyTurn = currentTurn === color

        setState((s) => ({
          ...s,
          status: 'playing',
          reconnecting: false,
          color,
          gameId,
          fen: fen ?? INITIAL_FEN,
          turn: currentTurn,
          isCheck: isCheck ?? false,
          lastMove: lastMove ? [lastMove[0] as Key, lastMove[1] as Key] : undefined,
          dests: isMyTurn ? getDestinations(chess) : new Map(),
          moves: (moves ?? []).map((m) => ({
            san: m.san,
            fen: m.fen,
            color: m.color as 'w' | 'b',
          })),
          winner: null,
          endReason: null,
          error: null,
          whiteUsername,
          blackUsername,
          whiteMs,
          blackMs,
          promotionPending: null,
        }))
      },
    )

    socket.on(
      EVENTS.MOVE_MADE,
      ({ from, to, san, fen, whiteMs, blackMs }: {
        from: string; to: string; san: string; fen: string
        whiteMs: number; blackMs: number
      }) => {
        const chess = chessRef.current
        chess.load(fen)
        const movedColor = fen.split(' ')[1] === 'w' ? 'b' : 'w'
        const lastMove: [Key, Key] = [from as Key, to as Key]
        const myColor = colorRef.current
        const myColorLetter = myColor === 'white' ? 'w' : 'b'
        const isMyOwnMove = movedColor === myColorLetter
        const isMyTurn = chess.turn() === myColorLetter
        setState((s) => ({
          ...s,
          fen,
          turn: chess.turn() === 'w' ? 'white' : 'black',
          isCheck: chess.inCheck(),
          lastMove,
          dests: isMyTurn ? getDestinations(chess) : new Map(),
          // Own moves are already added optimistically in executeMove — skip here
          moves: isMyOwnMove ? s.moves : [...s.moves, { san, fen, color: movedColor as 'w' | 'b' }],
          whiteMs,
          blackMs,
        }))
      },
    )

    socket.on(
      EVENTS.GAME_OVER,
      ({ winner, reason }: { winner: 'white' | 'black' | 'draw'; reason: string }) => {
        sessionStorage.removeItem(SESSION_KEY)
        setState((s) => ({
          ...s,
          status: 'over',
          winner,
          endReason: reason,
          dests: new Map(),
          promotionPending: null,
        }))
      },
    )

    socket.on(EVENTS.GAME_ERROR, ({ message }: { message: string }) => {
      console.warn('[online game error]', message)
      // If we get an error while waiting (e.g. reconnect failed), fall back to idle
      setState((s) => {
        if (s.status === 'waiting') {
          sessionStorage.removeItem(SESSION_KEY)
          return { ...s, status: 'idle', reconnecting: false, error: message }
        }
        return s
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: attempt reconnect if there's a stored game session
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw || !accessToken) return
    let gameId: string
    try {
      const parsed = JSON.parse(raw)
      gameId = parsed.gameId
      if (!gameId) throw new Error()
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
      return
    }

    const socket = getSocket(accessToken)
    applyHandlers(socket)
    setState((s) => ({ ...s, status: 'waiting', reconnecting: true }))

    const emitReconnect = () => socket.emit(EVENTS.RECONNECT_GAME, { gameId })
    if (socket.connected) {
      emitReconnect()
    } else {
      socket.connect()
      socket.once('connect', emitReconnect)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const joinMatchmaking = useCallback(() => {
    if (!accessToken) return
    const socket = getSocket(accessToken)
    const tc = timeControlRef.current

    applyHandlers(socket)
    socket.connect()

    socket.emit(EVENTS.INIT_GAME, { timeControl: tc })
    setState((s) => ({ ...s, status: 'waiting', reconnecting: false, error: null }))
  }, [accessToken, applyHandlers])

  const executeMove = useCallback(
    (from: Key, to: Key, promotion: PromotionPiece = 'q'): boolean => {
      if (!accessToken) return false
      const chess = chessRef.current
      let result
      try {
        result = chess.move({ from, to, promotion })
      } catch {
        return false
      }
      if (!result) return false

      getSocket(accessToken).emit(EVENTS.MOVE, { from, to, promotion })

      const fen = chess.fen()
      const myColor = colorRef.current
      const isMyTurn = chess.turn() === (myColor === 'white' ? 'w' : 'b')
      setState((s) => ({
        ...s,
        fen,
        turn: chess.turn() === 'w' ? 'white' : 'black',
        isCheck: chess.inCheck(),
        lastMove: [from, to],
        dests: isMyTurn ? getDestinations(chess) : new Map(),
        moves: [...s.moves, { san: result.san, fen, color: result.color }],
        promotionPending: null,
      }))
      return true
    },
    [accessToken],
  )

  const makeMove = useCallback(
    (from: Key, to: Key) => {
      if (isPawnPromotion(chessRef.current, from, to)) {
        promotionRef.current = { from, to }
        setState((s) => ({ ...s, promotionPending: { from, to } }))
        return
      }
      executeMove(from, to)
    },
    [executeMove],
  )

  const confirmPromotion = useCallback(
    (piece: PromotionPiece) => {
      const pending = promotionRef.current
      if (!pending) return
      promotionRef.current = null
      executeMove(pending.from, pending.to, piece)
    },
    [executeMove],
  )

  const resign = useCallback(() => {
    if (!accessToken) return
    getSocket(accessToken).emit(EVENTS.RESIGN)
  }, [accessToken])

  return {
    state,
    timeControl,
    setTimeControl,
    joinMatchmaking,
    makeMove,
    confirmPromotion,
    resign,
  }
}
