import './PlayerCard.css'

interface PlayerCardProps {
  username: string
  color: 'white' | 'black'
  timeMs: number
  isActive: boolean
}

export default function PlayerCard({ username, color, timeMs, isActive }: PlayerCardProps) {
  const initials = username ? username.slice(0, 2).toUpperCase() : color === 'white' ? 'WH' : 'BL'
  const isDanger = timeMs > 0 && timeMs < 30_000

  return (
    <div className="pc-card">
      <div className={`pc-avatar pc-avatar--${color}`} aria-hidden="true">
        {initials}
      </div>
      <span className="pc-name">{username || color}</span>
      <span
        className={[
          'pc-clock',
          isActive ? 'pc-clock--active' : '',
          isDanger ? 'pc-clock--danger' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="off"
      >
        {formatMs(timeMs)}
      </span>
    </div>
  )
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
