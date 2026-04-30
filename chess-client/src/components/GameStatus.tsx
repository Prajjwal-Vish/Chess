import type { GameStatus } from '../hooks/useChessGame'

interface GameStatusProps {
  status: GameStatus
  turn: 'white' | 'black'
  isCheck: boolean
  onReset: () => void
}

export default function GameStatusBanner({
  status,
  turn,
  isCheck,
  onReset,
}: GameStatusProps) {
  if (status === 'playing') {
    return (
      <div style={styles.playing}>
        {isCheck ? (
          <span style={{ color: '#ef4444', fontWeight: 600 }}>
            ⚠ {turn === 'white' ? 'White' : 'Black'} is in check
          </span>
        ) : (
          <span>
            {turn === 'white' ? '⬜ White' : '⬛ Black'} to move
          </span>
        )}
      </div>
    )
  }

  const messages: Record<GameStatus, string> = {
    checkmate: `Checkmate! ${turn === 'white' ? 'Black' : 'White'} wins`,
    stalemate: 'Stalemate — Draw',
    draw: 'Draw',
    resigned: `${turn === 'white' ? 'Black' : 'White'} resigned`,
    playing: '',
  }

  return (
    <div style={styles.gameOver}>
      <span style={styles.gameOverText}>{messages[status]}</span>
      <button onClick={onReset} style={styles.resetBtn}>
        New game
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  playing: {
    padding: '10px 16px',
    background: 'var(--code-bg)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--text-h)',
    textAlign: 'center',
  },
  gameOver: {
    padding: '12px 16px',
    background: 'var(--accent-bg)',
    border: '1px solid var(--accent-border)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  gameOverText: {
    fontWeight: 600,
    color: 'var(--accent)',
    fontSize: '15px',
  },
  resetBtn: {
    padding: '6px 14px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    flexShrink: 0,
  },
}