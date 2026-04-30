import { useState, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import type { Api } from 'chessground/api'
import type { Key } from 'chessground/types'

export type GameStatus =
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned'

export interface MoveRecord {
  san: string
  uci: string
  fen: string
  color: 'w' | 'b'
  moveNumber: number
}

export interface GameState {
  fen: string
  turn: 'white' | 'black'
  status: GameStatus
  moves: MoveRecord[]
  isCheck: boolean
  capturedByWhite: string[]
  capturedByBlack: string[]
}

function getDestinations(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  const squares = chess.board().flat()

  for (const square of squares) {
    if (!square) continue
    const moves = chess.moves({ square: square.square, verbose: true })
    if (moves.length > 0) {
      dests.set(
        square.square as Key,
        moves.map((m) => m.to as Key)
      )
    }
  }
  return dests
}

function getStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return 'checkmate'
  if (chess.isStalemate()) return 'stalemate'
  if (chess.isDraw()) return 'draw'
  return 'playing'
}

export function useChessGame(startingFen?: string) {
  const chessRef = useRef(
    new Chess(startingFen ?? undefined)
  )
  const cgApiRef = useRef<Api | null>(null)

  const buildState = useCallback((): GameState => {
    const chess = chessRef.current
    const history = chess.history({ verbose: true })

    const moves: MoveRecord[] = history.map((m, i) => ({
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ''),
      fen: '', // we'll fill this below
      color: m.color,
      moveNumber: Math.floor(i / 2) + 1,
    }))

    // Rebuild FEN after each move for the move list
    const tempChess = new Chess(startingFen ?? undefined)
    for (let i = 0; i < moves.length; i++) {
      const h = history[i]
      tempChess.move(h)
      moves[i].fen = tempChess.fen()
    }

    // Captured pieces
    const capturedByWhite: string[] = []
    const capturedByBlack: string[] = []
    for (const m of history) {
      if (m.captured) {
        if (m.color === 'w') capturedByWhite.push(m.captured)
        else capturedByBlack.push(m.captured)
      }
    }

    return {
      fen: chess.fen(),
      turn: chess.turn() === 'w' ? 'white' : 'black',
      status: getStatus(chess),
      moves,
      isCheck: chess.isCheck(),
      capturedByWhite,
      capturedByBlack,
    }
  }, [startingFen])

  const [gameState, setGameState] = useState<GameState>(buildState)

  const syncBoard = useCallback(() => {
    const chess = chessRef.current
    const cg = cgApiRef.current
    if (!cg) return

    const status = getStatus(chess)
    const isOver = status !== 'playing'

    cg.set({
      fen: chess.fen(),
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: {
        color: isOver ? undefined : chess.turn() === 'w' ? 'white' : 'black',
        dests: isOver ? new Map() : getDestinations(chess),
      },
      check: chess.isCheck(),
    })

    setGameState(buildState())
  }, [buildState])

  const onBoardReady = useCallback(
    (api: Api) => {
      cgApiRef.current = api
      syncBoard()
    },
    [syncBoard]
  )

  const makeMove = useCallback(
    (from: Key, to: Key): boolean => {
      const chess = chessRef.current

      // Check for promotion
      const piece = chess.get(from as any)
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') ||
          (piece.color === 'b' && to[1] === '1'))

      try {
        const result = chess.move({
          from: from as any,
          to: to as any,
          promotion: isPromotion ? 'q' : undefined, // auto-promote to queen
        })

        if (!result) return false
        syncBoard()
        return true
      } catch {
        return false
      }
    },
    [syncBoard]
  )

  const resign = useCallback((color: 'white' | 'black') => {
    setGameState((prev) => ({ ...prev, status: 'resigned' }))
    cgApiRef.current?.set({ movable: { color: undefined, dests: new Map() } })
  }, [])

  const reset = useCallback(() => {
    chessRef.current = new Chess(startingFen ?? undefined)
    syncBoard()
  }, [startingFen, syncBoard])

  const seekToMove = useCallback(
    (fen: string) => {
      cgApiRef.current?.set({ fen, movable: { color: undefined, dests: new Map() } })
    },
    []
  )

  return {
    gameState,
    onBoardReady,
    makeMove,
    resign,
    reset,
    seekToMove,
    cgApiRef,
  }
}