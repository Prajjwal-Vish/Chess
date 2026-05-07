import { useEffect, useRef } from 'react'
import type { MoveRecord } from '../hooks/useChessGame'

interface MoveListProps {
  moves: MoveRecord[]
  onSeek?: (fen: string, index: number) => void
  currentIndex?: number
  noAutoScroll?: boolean
  horizontal?: boolean
}

export default function MoveList({
  moves,
  onSeek,
  currentIndex,
  noAutoScroll,
  horizontal,
}: MoveListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (noAutoScroll) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length, noAutoScroll])

  if (moves.length === 0) {
    return <div style={styles.empty}>No moves yet</div>
  }

  // Group into pairs: [white, black]
  const pairs: { white: MoveRecord; black?: MoveRecord; number: number }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: moves[i].moveNumber, white: moves[i], black: moves[i + 1] })
  }

  if (horizontal) {
    return (
      <div style={horizStyles.container}>
        {pairs.map((pair) => (
          <span key={pair.number} style={horizStyles.group}>
            <span style={horizStyles.num}>{pair.number}.</span>
            <span style={horizStyles.move}>{pair.white.san}</span>
            {pair.black && <span style={horizStyles.move}>{pair.black.san}</span>}
          </span>
        ))}
        <div ref={endRef} />
      </div>
    )
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
    opacity: 0.5,
    fontSize: '13px',
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
    opacity: 0.45,
    width: '28px',
    flexShrink: 0,
    fontSize: '12px',
  },
  move: {
    padding: '2px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
    color: 'var(--text-h)',
    transition: 'background 0.1s',
    fontSize: '13px',
  },
  active: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
  },
}

const horizStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '0',
    overflowX: 'auto',
    fontFamily: 'var(--mono)',
    fontSize: '13px',
    color: 'var(--text-h)',
    padding: '0 2px',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    scrollbarWidth: 'none',
  },
  group: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    marginRight: '10px',
    flexShrink: 0,
  },
  num: {
    opacity: 0.4,
    fontSize: '12px',
  },
  move: {
    padding: '1px 3px',
  },
}
