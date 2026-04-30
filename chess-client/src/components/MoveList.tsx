import { useEffect, useRef } from 'react'
import type { MoveRecord } from '../hooks/useChessGame'

interface MoveListProps {
  moves: MoveRecord[]
  onSeek?: (fen: string, index: number) => void
  currentIndex?: number
}

export default function MoveList({ moves, onSeek, currentIndex }: MoveListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <div style={styles.empty}>No moves yet</div>
    )
  }

  // Group into pairs: [white, black]
  const pairs: { white: MoveRecord; black?: MoveRecord; number: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: moves[i].moveNumber,
      white: moves[i],
      black: moves[i + 1],
    })
  }

  return (
    <div style={styles.container}>
      {pairs.map((pair) => (
        <div key={pair.number} style={styles.row}>
          <span style={styles.moveNumber}>{pair.number}.</span>
          <span
            style={{
              ...styles.move,
              ...(currentIndex === (pair.number - 1) * 2 ? styles.active : {}),
            }}
            onClick={() => onSeek?.(pair.white.fen, (pair.number - 1) * 2)}
          >
            {pair.white.san}
          </span>
          {pair.black && (
            <span
              style={{
                ...styles.move,
                ...(currentIndex === (pair.number - 1) * 2 + 1 ? styles.active : {}),
              }}
              onClick={() => onSeek?.(pair.black!.fen, (pair.number - 1) * 2 + 1)}
            >
              {pair.black.san}
            </span>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    overflowY: 'auto',
    flex: 1,
    padding: '8px 4px',
    fontFamily: 'var(--mono)',
    fontSize: '14px',
  },
  empty: {
    color: 'var(--text)',
    fontSize: '14px',
    padding: '16px',
    textAlign: 'center',
  },
  row: {
    display: 'flex',
    gap: '4px',
    padding: '2px 0',
    alignItems: 'center',
  },
  moveNumber: {
    color: 'var(--text)',
    width: '28px',
    flexShrink: 0,
    fontSize: '13px',
  },
  move: {
    padding: '2px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
    color: 'var(--text-h)',
    transition: 'background 0.1s',
  },
  active: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
  },
}