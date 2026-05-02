import { useCallback } from 'react'
import type { Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import { Link } from 'react-router-dom'
import Chessboard from '../components/Chessboard'
import MoveList from '../components/MoveList'
import { useOnlineGame } from '../hooks/useOnlineGame'

export default function OnlineGame() {
  const { state, joinMatchmaking, makeMove, resign } = useOnlineGame()

  const handleMove = useCallback(
    (from: Key, to: Key) => makeMove(from, to),
    [makeMove],
  )

  const isMyTurn =
    state.status === 'playing' &&
    state.turn === state.color

  const config: Config = {
    orientation: state.color,
    fen: state.fen,
    turnColor: state.turn,
    lastMove: state.lastMove,
    check: state.isCheck,
    movable: {
      free: false,
      color: isMyTurn ? state.color : undefined,
      showDests: true,
      dests: state.dests,
      events: { after: handleMove },
    },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 150 },
    premovable: { enabled: false },
  }

  const opponentColor = state.color === 'white' ? 'black' : 'white'
  const opponentTurn = state.status === 'playing' && state.turn === opponentColor

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link to="/" style={styles.backLink}>← Home</Link>
        <h2 style={styles.title}>Play Online</h2>
      </div>

      {/* Waiting overlay */}
      {state.status === 'waiting' && (
        <div style={styles.overlay}>
          <div style={styles.waitingBox}>
            <div style={styles.spinner} />
            <p style={styles.waitingText}>Finding an opponent…</p>
            <Link to="/" style={styles.cancelLink}>Cancel</Link>
          </div>
        </div>
      )}

      {/* Idle — not yet clicked Play */}
      {state.status === 'idle' && (
        <div style={styles.overlay}>
          <div style={styles.waitingBox}>
            {state.error && (
              <p style={styles.errorText}>{state.error}</p>
            )}
            <p style={styles.waitingText}>Ready to play?</p>
            <button onClick={joinMatchmaking} style={styles.playBtn}>
              Find a game
            </button>
          </div>
        </div>
      )}

      {/* Main layout — visible once playing or over */}
      {(state.status === 'playing' || state.status === 'over') && (
        <div style={styles.layout}>
          {/* Board side */}
          <div style={styles.boardSide}>
            {/* Opponent label */}
            <div style={styles.playerLabel}>
              <span style={styles.playerDot(opponentColor)} />
              {opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)}
              {opponentTurn && <span style={styles.turnIndicator}>● thinking</span>}
            </div>

            <div style={styles.boardWrapper}>
              <Chessboard config={config} />
            </div>

            {/* Player label */}
            <div style={styles.playerLabel}>
              <span style={styles.playerDot(state.color)} />
              You ({state.color})
              {isMyTurn && <span style={styles.turnIndicator}>● your turn</span>}
            </div>
          </div>

          {/* Side panel */}
          <div style={styles.panel}>
            {/* Game result banner */}
            {state.status === 'over' && (
              <div style={styles.resultBanner(state.winner, state.color)}>
                {state.winner === 'draw'
                  ? 'Draw'
                  : state.winner === state.color
                  ? 'You won!'
                  : 'You lost'}
                {state.endReason && (
                  <span style={styles.resultReason}>
                    {' '}· {formatReason(state.endReason)}
                  </span>
                )}
              </div>
            )}

            {/* Move list */}
            <div style={styles.moveListWrapper}>
              <div style={styles.sectionLabel}>Moves</div>
              <MoveList
                moves={state.moves.map((m, i) => ({
                  san: m.san,
                  uci: '',
                  fen: m.fen,
                  color: m.color,
                  moveNumber: Math.floor(i / 2) + 1,
                }))}
                onSeek={() => {}}
                currentIndex={undefined}
              />
            </div>

            {/* Controls */}
            {state.status === 'playing' && (
              <div style={styles.controls}>
                <button onClick={resign} style={styles.resignBtn}>
                  Resign
                </button>
              </div>
            )}
            {state.status === 'over' && (
              <div style={styles.controls}>
                <button onClick={joinMatchmaking} style={styles.newGameBtn}>
                  New game
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatReason(reason: string) {
  return reason.replace(/_/g, ' ')
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px 32px',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
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
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    zIndex: 50,
  },
  waitingBox: {
    background: 'var(--bg-panel, #1e1e2e)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    minWidth: '240px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite',
  },
  waitingText: {
    margin: 0,
    fontSize: '16px',
    color: 'var(--text)',
  },
  errorText: {
    margin: 0,
    fontSize: '13px',
    color: '#dc3232',
    textAlign: 'center' as const,
    maxWidth: '220px',
  },
  cancelLink: {
    color: 'var(--text)',
    fontSize: '13px',
    opacity: 0.6,
    textDecoration: 'underline',
  },
  playBtn: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
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
    flexDirection: 'column' as const,
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
    flexDirection: 'column' as const,
    gap: '16px',
    height: 'min(560px, calc(100vw - 48px))',
  },
  resultBanner: (winner: string | null, playerColor: string): React.CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '15px',
    background:
      winner === 'draw'
        ? 'rgba(255,255,255,0.08)'
        : winner === playerColor
        ? 'rgba(29,158,117,0.2)'
        : 'rgba(220,50,50,0.2)',
    color:
      winner === 'draw'
        ? 'var(--text)'
        : winner === playerColor
        ? '#1d9e75'
        : '#dc3232',
    border: `1px solid ${
      winner === 'draw'
        ? 'var(--border)'
        : winner === playerColor
        ? 'rgba(29,158,117,0.4)'
        : 'rgba(220,50,50,0.4)'
    }`,
  }),
  resultReason: {
    fontWeight: 400,
    fontSize: '13px',
    opacity: 0.8,
  },
  moveListWrapper: {
    flex: 1,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
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
