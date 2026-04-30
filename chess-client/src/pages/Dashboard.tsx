import { useAuthStore } from '../stores/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import Button from '../components/ui/Button'

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await authApi.logout()
    clearAuth()
    navigate('/login')
  }

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px' }}>♟ Chess Platform</h1>
          <p style={{ margin: 0, color: 'var(--text)' }}>
            Welcome back, <strong>{user?.username}</strong> · Rating: {user?.rating}
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout} style={{ width: 'auto' }}>
          Sign out
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Link to="/play/local" style={{ textDecoration: 'none' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>♟</div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px' }}>Local game</h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
              Two players on this device
            </p>
          </div>
        </Link>

        <div style={{ ...cardStyle, opacity: 0.5, cursor: 'not-allowed' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌐</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px' }}>Online game</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
            Coming soon
          </p>
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  padding: '28px 24px',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  background: 'var(--bg)',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
  textAlign: 'left',
}