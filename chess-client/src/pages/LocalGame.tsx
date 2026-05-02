import { useState, useCallback } from 'react'
import type { Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import Chessboard from '../components/Chessboard'
import MoveList from '../components/MoveList'
import GameStatusBanner from '../components/GameStatus'
import { useChessGame } from '../hooks/useChessGame'
import { Link } from 'react-router-dom'

export default function LocalGame() {
  const { gameState, onBoardReady, makeMove, resign, reset, seekToMove } =
    useChessGame()

  const [seekIndex, setSeekIndex] = useState<number | undefined>(undefined)
  const [flipped, setFlipped] = useState(false)

  const handleMove = useCallback(
    (from: Key, to: Key) => {
      const success = makeMove(from, to)
      if (success) setSeekIndex(undefined)
      return success
    },
    [makeMove]
  )

  const handleSeek = useCallback(
    (fen: string, index: number) => {
      seekToMove(fen)
      setSeekIndex(index)
    },
    [seekToMove]
  )

  const handleReset = useCallback(() => {
    reset()
    setSeekIndex(undefined)
  }, [reset])

  const config: Config = {
    orientation: flipped ? 'black' : 'white',
    movable: {
      free: false,
      color: gameState.turn,
      showDests: true,
      events: {
        after: handleMove,
      },
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: { enabled: true, duration: 150 },
    premovable: { enabled: false },
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link to="/" style={styles.backLink}>← Home</Link>
        <h2 style={styles.title}>Local Game</h2>
        <button
          onClick={() => setFlipped((f) => !f)}
          style={styles.flipBtn}
        >
          ⇅ Flip
        </button>
      </div>

      {/* Main layout */}
      <div style={styles.layout}>
        {/* Board side */}
        <div style={styles.boardSide}>
          {/* Black player label */}
          <div style={styles.playerLabel}>
            <span style={styles.playerDot('black')} />
            Black
            {gameState.turn === 'black' && gameState.status === 'playing' && (
              <span style={styles.turnIndicator}>● thinking</span>
            )}
          </div>

          <div style={styles.boardWrapper}>
            <Chessboard config={config} onReady={onBoardReady} />
          </div>

          {/* White player label */}
          <div style={styles.playerLabel}>
            <span style={styles.playerDot('white')} />
            White
            {gameState.turn === 'white' && gameState.status === 'playing' && (
              <span style={styles.turnIndicator}>● thinking</span>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={styles.panel}>
          <GameStatusBanner
            status={gameState.status}
            turn={gameState.turn}
            isCheck={gameState.isCheck}
            onReset={handleReset}
          />

          {/* Move list */}
          <div style={styles.moveListWrapper}>
            <div style={styles.sectionLabel}>Moves</div>
            <MoveList
              moves={gameState.moves}
              onSeek={handleSeek}
              currentIndex={seekIndex}
            />
          </div>

          {/* Controls */}
          {gameState.status === 'playing' && (
            <div style={styles.controls}>
              <button
                onClick={() => resign(gameState.turn)}
                style={styles.resignBtn}
              >
                Resign
              </button>
              <button onClick={handleReset} style={styles.newGameBtn}>
                New game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px 32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backLink: {
    color: 'var(--text)',
    textDecoration: 'none',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    flex: 1,
  },
  flipBtn: {
    padding: '6px 14px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '14px',
  },
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  boardSide: {
    flex: '0 0 auto',
    width: 'min(560px, calc(100vw - 48px))',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  boardWrapper: {
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  playerLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-h)',
    padding: '4px 0',
  },
  playerDot: (color: string): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: color === 'white' ? '#f0d9b5' : '#b58863',
    border: '1px solid var(--border)',
    flexShrink: 0,
  }),
  turnIndicator: {
    marginLeft: 'auto',
    fontSize: '13px',
    color: 'var(--accent)',
  },
  panel: {
    flex: '1 1 240px',
    minWidth: '200px',
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'min(560px, calc(100vw - 48px))',
  },
  moveListWrapper: {
    flex: 1,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  sectionLabel: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  resignBtn: {
    flex: 1,
    padding: '8px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '14px',
  },
  newGameBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    background: 'var(--accent)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
} as const