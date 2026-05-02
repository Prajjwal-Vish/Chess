import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Both fields are required')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.login(form)
      setAuth(data.user, data.accessToken)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>♟</div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </form>

        <p style={styles.switchText}>
          No account yet?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 36px',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    background: 'var(--bg)',
    textAlign: 'left',
  },
  logo: { fontSize: '40px', marginBottom: '16px' },
  title: { fontSize: '28px', fontWeight: 600, color: 'var(--text-h)', margin: '0 0 6px' },
  subtitle: { color: 'var(--text)', marginBottom: '28px', fontSize: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '16px',
  },
  switchText: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text)' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 },
}