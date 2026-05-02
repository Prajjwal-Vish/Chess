import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!form.username) e.username = 'Username is required'
    else if (form.username.length < 3) e.username = 'At least 3 characters'
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username))
      e.username = 'Letters, numbers, underscores only'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'At least 8 characters'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }
    setErrors({})
    setLoading(true)
    try {
      const data = await authApi.register(form)
      setAuth(data.user, data.accessToken)
      navigate('/')
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>♟</div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Start playing chess today</p>

        {serverError && (
          <div style={styles.errorBanner}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <Input
            label="Username"
            type="text"
            placeholder="e.g. magnus99"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            error={errors.username}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />
          <Button type="submit" loading={loading}>
            Create account
          </Button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
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
  logo: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: 'var(--text-h)',
    margin: '0 0 6px',
  },
  subtitle: {
    color: 'var(--text)',
    marginBottom: '28px',
    fontSize: '15px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '16px',
  },
  switchText: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: 'var(--text)',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}