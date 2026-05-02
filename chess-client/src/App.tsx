import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Home from './pages/Home'
import LocalGame from './pages/LocalGame'
import OnlineGame from './pages/OnlineGame'

/** Wraps routes that genuinely need a session (e.g. online play). */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/play/local" element={<LocalGame />} />
        <Route path="/play/online" element={<ProtectedRoute><OnlineGame /></ProtectedRoute>} />

        {/* Legacy redirect */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* Unknown routes → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
