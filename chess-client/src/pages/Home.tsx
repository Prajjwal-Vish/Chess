import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import { Logo, Avatar, SegmentedRow, Toggle } from '../components/ui'

const TIME_CONTROLS = ['1+0', '3+0', '5+0', '10+0', '15+10'] as const
type TimeControl = (typeof TIME_CONTROLS)[number]

export default function Home() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const [selectedTime, setSelectedTime] = useState<TimeControl>('5+0')
  const [blacksView, setBlacksView] = useState(false)
  const [sideToMove, setSideToMove] = useState(false)

  async function handleLogout() {
    await authApi.logout()
    clearAuth()
  }

  function requireAuth(then: () => void) {
    if (!isAuthenticated) { navigate('/login'); return }
    then()
  }

  const initial = user?.username?.[0] ?? 'G'

  return (
    <div className="min-h-screen flex flex-col bg-page font-sans text-text-secondary overflow-x-hidden">
      {/* Decorative glows */}
      <div className="fixed pointer-events-none top-0 right-0 w-[500px] h-[500px] -translate-y-1/3 translate-x-1/3 rounded-full z-0 [background:radial-gradient(circle,rgba(163,116,240,0.15)_0%,transparent_70%)]" />
      <div className="fixed pointer-events-none bottom-0 left-0 w-96 h-96 translate-y-1/3 -translate-x-1/3 rounded-full z-0 [background:radial-gradient(circle,rgba(91,141,239,0.12)_0%,transparent_70%)]" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 xl:px-16 py-4 border-b-half border-border-subtle shrink-0">
        <Logo size="md" />

        <nav className="flex items-center gap-4 md:gap-6 text-[13px]">
          {(['Play', 'Puzzles', 'Learn', 'Scan'] as const).map((label) => (
            <a key={label} href="#" className="hidden md:block text-text-secondary hover:text-text-primary transition-colors no-underline">
              {label}
            </a>
          ))}
          <span className="hidden md:block text-white/15 select-none">|</span>

          {isAuthenticated ? (
            <>
              <button
                onClick={handleLogout}
                className="text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer text-[13px] font-sans p-0 transition-colors"
              >
                {user?.username}
              </button>
              <Avatar initial={initial} size={30} />
            </>
          ) : (
            <>
              <Link to="/login" className="text-text-secondary hover:text-text-primary no-underline transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-xs px-3 py-1.5 rounded-pill bg-brand-blue/15 text-brand-blue border-half border-border-brand hover:bg-brand-blue/25 transition-colors no-underline"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2">

        {/* ── Left: Play chess ── */}
        <section className="px-6 md:px-10 xl:px-16 py-8 md:py-12 flex flex-col gap-5">
          <div>
            <h2 className="text-xl md:text-2xl font-medium text-text-primary m-0 mb-1">Play chess</h2>
            <p className="text-sm text-text-tertiary m-0">Challenge players or sharpen your game</p>
          </div>

          {/* Play online hero card */}
          <div
            onClick={() => requireAuth(() => navigate('/play/online'))}
            className="relative overflow-hidden rounded-hero border-half border-border-brand px-4 md:px-5 py-4 cursor-pointer [background:linear-gradient(135deg,rgba(91,141,239,0.18)_0%,rgba(163,116,240,0.10)_100%)]"
          >
            <div className="absolute -top-5 -right-5 w-[100px] h-[100px] rounded-full pointer-events-none [background:radial-gradient(circle,rgba(91,141,239,0.25)_0%,transparent_70%)]" />
            <div className="flex items-center justify-between mb-3 relative">
              <div className="flex items-center gap-[10px]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b8def" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
                </svg>
                <span className="text-sm md:text-[15px] font-medium text-text-primary">Play online</span>
              </div>
              <span className="text-xs text-text-tertiary">
                {isAuthenticated ? 'Pick a time control' : 'Sign in to play'}
              </span>
            </div>
            <div className="flex gap-1.5 relative flex-wrap">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc}
                  onClick={(e) => { e.stopPropagation(); setSelectedTime(tc) }}
                  className={`flex-1 min-w-[44px] text-center text-xs py-1.5 rounded-md transition-colors cursor-pointer border-none font-sans ${
                    selectedTime === tc
                      ? 'bg-brand-blue/25 text-text-primary border-half border-brand-blue/40'
                      : 'bg-white/[0.06] text-text-secondary'
                  }`}
                >
                  {tc}
                </button>
              ))}
            </div>
          </div>

          {/* Play a friend / Play computer */}
          <SegmentedRow>
            <button
              onClick={() => requireAuth(() => {})}
              className="flex items-center gap-2 md:gap-[10px] px-4 py-3 cursor-pointer bg-transparent border-none text-left font-sans hover:bg-white/[0.03] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a374f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="4" />
                <path d="M5.5 17.5C5.5 14 7 13 9 13s3.5 1 3.5 4.5" />
                <circle cx="17" cy="8" r="3" />
              </svg>
              <span className="text-sm text-text-primary">Play a friend</span>
            </button>
            <Link
              to="/play/local"
              className="flex items-center gap-2 md:gap-[10px] px-4 py-3 no-underline hover:bg-white/[0.03] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d9e75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M9 9h6v6H9z" />
              </svg>
              <span className="text-sm text-text-primary">Play computer</span>
            </Link>
          </SegmentedRow>

          {/* Game history / Analyze */}
          <SegmentedRow>
            <button
              onClick={() => requireAuth(() => {})}
              className="flex items-center gap-2 md:gap-[10px] px-4 py-3 cursor-pointer bg-transparent border-none text-left font-sans hover:bg-white/[0.03] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b8def" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" />
              </svg>
              <span className="text-sm text-text-primary">Game history</span>
            </button>
            <button className="flex items-center gap-2 md:gap-[10px] px-4 py-3 cursor-pointer bg-transparent border-none text-left font-sans hover:bg-white/[0.03] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.5 6.5L21 9l-5 4.5 1.5 7L12 17l-5.5 3.5L8 13.5 3 9l6.5-.5L12 2z" />
              </svg>
              <span className="text-sm text-text-primary">Analyze a game</span>
            </button>
          </SegmentedRow>

          {/* Stats / Sign-in prompt */}
          {isAuthenticated ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary uppercase tracking-[0.6px]">Your stats</span>
                <a href="#" className="text-xs text-brand-blue no-underline hover:underline">View all</a>
              </div>
              <SegmentedRow>
                <div className="px-4 py-2.5">
                  <div className="text-[10.5px] text-text-tertiary mb-[1px]">Rapid</div>
                  <div className="text-base font-medium text-text-primary">{user?.rating}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-[10.5px] text-text-tertiary mb-[1px]">Blitz</div>
                  <div className="text-base font-medium text-text-primary">{user?.rating}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-[10.5px] text-text-tertiary mb-[1px]">Bullet</div>
                  <div className="text-base font-medium text-text-primary">{user?.rating}</div>
                </div>
              </SegmentedRow>
            </div>
          ) : (
            <div className="border-half border-border-subtle rounded-panel px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-text-tertiary">Sign in to track your rating &amp; history</span>
              <Link to="/login" className="text-xs text-brand-blue no-underline hover:underline shrink-0 ml-3">
                Sign in →
              </Link>
            </div>
          )}
        </section>

        {/* ── Right: Scan a board ── */}
        <section className="px-6 md:px-10 xl:px-16 py-8 md:py-12 border-t-half lg:border-t-0 lg:border-l-half border-border-subtle relative flex flex-col gap-5">
          <div>
            <span className="inline-block text-[9.5px] px-2 py-[3px] rounded-[4px] mb-2 tracking-[0.6px] border-half border-brand-purple/25 [background:linear-gradient(90deg,rgba(163,116,240,0.2),rgba(91,141,239,0.2))] text-[#c0a7f5]">
              SIGNATURE FEATURE
            </span>
            <h2 className="text-xl md:text-2xl font-medium text-text-primary m-0 mb-1">Scan a board</h2>
            <p className="text-sm text-text-tertiary m-0">Snap any chess position to FEN, instantly</p>
          </div>

          {/* Drop zone */}
          <div className="relative overflow-hidden rounded-modal border-[1.5px] border-dashed border-brand-blue/40 px-5 py-10 md:py-16 text-center cursor-pointer [background:linear-gradient(135deg,rgba(91,141,239,0.08)_0%,rgba(163,116,240,0.06)_100%)]">
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" aria-hidden="true">
              <defs>
                <pattern id="chess-bg" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="25" height="25" fill="#5b8def" />
                  <rect x="25" y="25" width="25" height="25" fill="#5b8def" />
                </pattern>
              </defs>
              <rect width="400" height="200" fill="url(#chess-bg)" />
            </svg>
            <div className="absolute -top-[30px] -right-[30px] w-[140px] h-[140px] rounded-full pointer-events-none [background:radial-gradient(circle,rgba(163,116,240,0.18)_0%,transparent_70%)]" />
            <div className="absolute -bottom-[30px] -left-[30px] w-[120px] h-[120px] rounded-full pointer-events-none [background:radial-gradient(circle,rgba(91,141,239,0.18)_0%,transparent_70%)]" />
            <div className="relative">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-brand-gradient flex items-center justify-center mx-auto mb-3 [box-shadow:0_4px_20px_rgba(91,141,239,0.3)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15.5c-1.5-1.5-3.5-2-5.5-2H8.5C6.5 13.5 4.5 14 3 15.5" />
                  <path d="M12 13.5V3" />
                  <polyline points="8 7 12 3 16 7" />
                </svg>
              </div>
              <p className="text-base font-medium text-text-primary m-0 mb-1">Drag &amp; drop or click</p>
              <p className="text-sm text-text-tertiary m-0">Supports PNG, JPG, JPEG</p>
            </div>
          </div>

          {/* Toggles */}
          <SegmentedRow>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-secondary">Black's view</span>
              <Toggle checked={blacksView} onChange={setBlacksView} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-secondary">Side to move</span>
              <div className="flex items-center gap-2">
                <Toggle checked={sideToMove} onChange={setSideToMove} />
                <span className="text-xs text-text-primary">{sideToMove ? 'Black' : 'White'}</span>
              </div>
            </div>
          </SegmentedRow>

          {/* Ready to analyze */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-white/[0.04] border-half border-border-strong">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-warning glow-dot-warning shrink-0" />
              <span className="text-sm text-text-secondary">Ready to analyze</span>
            </div>
            <p className="text-xs text-text-tertiary m-0">Configure options &amp; upload</p>
          </div>
        </section>

      </main>
    </div>
  )
}
