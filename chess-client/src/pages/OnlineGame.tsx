import './OnlineGame.css'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import Chessboard from '../components/Chessboard'
import MoveList from '../components/MoveList'
import PlayerCard from '../components/game/PlayerCard'
import BottomSheet from '../components/game/BottomSheet'
import {
  useOnlineGame,
  TIME_CONTROLS,
  type PromotionPiece,
  type TimeControlOption,
} from '../hooks/useOnlineGame'

// Chat message shape — populated from socket.on('chat_message', handler) when backend is ready.
// Expected server payload: { sender: string; text: string; gameId: string }
type ChatMessage = { sender: string; text: string; own: boolean }

export default function OnlineGame() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const initialTc =
    ((location.state as Record<string, unknown>)?.timeControl as TimeControlOption) ?? '5+0'

  const { state, timeControl, setTimeControl, joinMatchmaking, makeMove, confirmPromotion, resign } =
    useOnlineGame(initialTc)

  const [abortOpen,  setAbortOpen]  = useState(false)
  const [resignOpen, setResignOpen] = useState(false)
  const [drawOpen,   setDrawOpen]   = useState(false)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [flipped,    setFlipped]    = useState(false)
  // null = live/latest; number = index into state.moves (0-based)
  const [seekIndex, setSeekIndex]   = useState<number | null>(null)

  // Auto-jump to live whenever a new move arrives
  useEffect(() => { setSeekIndex(null) }, [state.moves.length])

  // TODO: populate from socket.on('chat_message', ...) when backend chat is implemented
  const [chatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput]  = useState('')

  function handleBack() {
    if (state.status === 'playing') { setAbortOpen(true); return }
    navigate('/')
  }

  function handleAbortConfirm() {
    resign()
    setAbortOpen(false)
    navigate('/')
  }

  function handleResignConfirm() {
    resign()
    setResignOpen(false)
  }

  function handleNewGame() {
    navigate('/play/online', { replace: true, state: { timeControl } })
    window.location.reload()
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    // TODO: socket.emit('chat_message', { text: chatInput.trim() }) when backend is ready
    setChatInput('')
  }

  const handleMove = useCallback((from: Key, to: Key) => makeMove(from, to), [makeMove])

  const opponentColor    = state.color === 'white' ? 'black' : 'white'
  const isMyTurn         = state.status === 'playing' && state.turn === state.color && !state.promotionPending
  const isOpponentTurn   = state.status === 'playing' && state.turn === opponentColor
  const myUsername       = state.color === 'white' ? state.whiteUsername : state.blackUsername
  const opponentUsername = state.color === 'white' ? state.blackUsername : state.whiteUsername
  const myMs             = state.color === 'white' ? state.whiteMs       : state.blackMs
  const opponentMs       = state.color === 'white' ? state.blackMs       : state.whiteMs

  const orientation = flipped
    ? (state.color === 'white' ? 'black' : 'white')
    : state.color

  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const isReviewing    = seekIndex !== null
  const displayFen     = isReviewing ? (state.moves[seekIndex]?.fen ?? STARTING_FEN) : state.fen
  const displayTurn    = (displayFen.split(' ')[1] === 'w' ? 'white' : 'black') as 'white' | 'black'
  const displayLastMove = isReviewing ? undefined : state.lastMove

  const atStart = state.moves.length === 0 || seekIndex === 0
  const atEnd   = seekIndex === null

  function seekFirst() { if (state.moves.length > 0) setSeekIndex(0) }
  function seekLast()  { setSeekIndex(null) }
  function seekPrev()  {
    if (seekIndex === null) setSeekIndex(Math.max(0, state.moves.length - 2))
    else if (seekIndex > 0) setSeekIndex(seekIndex - 1)
  }
  function seekNext()  {
    if (seekIndex === null) return
    if (seekIndex < state.moves.length - 1) setSeekIndex(seekIndex + 1)
    else setSeekIndex(null)
  }

  const config: Config = {
    orientation,
    fen:       displayFen,
    turnColor: isReviewing ? displayTurn : state.turn,
    lastMove:  displayLastMove,
    check:     isReviewing ? false : state.isCheck,
    movable: {
      free:      false,
      color:     (isMyTurn && !isReviewing) ? state.color : undefined,
      showDests: true,
      dests:     (isMyTurn && !isReviewing) ? state.dests : new Map(),
      events:    { after: handleMove },
    },
    highlight:   { lastMove: true, check: true },
    animation:   { enabled: true, duration: 150 },
    premovable:  { enabled: false },
  }

  const moveListData = state.moves.map((m, i) => ({
    san:        m.san,
    uci:        '',
    fen:        m.fen,
    color:      m.color,
    moveNumber: Math.floor(i / 2) + 1,
  }))

  const isPlaying = state.status === 'playing'
  const isOver    = state.status === 'over'

  const resultText =
    state.winner === 'draw'        ? 'Draw'
    : state.winner === state.color ? 'You won!'
    : 'You lost'

  const resultClass =
    state.winner === 'draw'        ? 'og-result-banner-draw'
    : state.winner === state.color ? 'og-result-banner-win'
    : 'og-result-banner-lose'

  const stripClass =
    state.winner === 'draw'        ? 'og-result-strip-draw'
    : state.winner === state.color ? 'og-result-strip-win'
    : 'og-result-strip-lose'

  return (
    <div className="og-page">

      {/* ── Left nav (desktop only, hidden on mobile via CSS) ── */}
      <nav className="og-nav" aria-label="Main navigation">
        <div className="og-nav__brand">
          <div className="og-nav__logo" aria-hidden="true" />
          <span className="og-nav__brand-name">Knightly</span>
        </div>
        <button className="og-nav__item og-nav__item--active" onClick={handleBack}>
          <span aria-hidden="true">♟</span>
          <span className="og-nav__label">Play</span>
        </button>
        <button className="og-nav__item" disabled aria-label="Puzzles — coming soon">
          <span aria-hidden="true">⚡</span>
          <span className="og-nav__label">Puzzles</span>
        </button>
        <button className="og-nav__item" disabled aria-label="Learn — coming soon">
          <span aria-hidden="true">📚</span>
          <span className="og-nav__label">Learn</span>
        </button>
        <button className="og-nav__item" disabled aria-label="Analyze — coming soon">
          <span aria-hidden="true">📊</span>
          <span className="og-nav__label">Analyze</span>
        </button>
        <button className="og-nav__item" disabled aria-label="Friends — coming soon">
          <span aria-hidden="true">👥</span>
          <span className="og-nav__label">Friends</span>
        </button>
      </nav>

      {/* ── Center play area ── */}
      <main className="og-play-area">
        {(isPlaying || isOver) ? (
          <>
            <PlayerCard
              username={opponentUsername}
              color={opponentColor}
              timeMs={opponentMs}
              isActive={isOpponentTurn}
            />

            <div className="og-board-wrapper">
              <div className="og-board-inner">
                <Chessboard config={config} />
                {state.promotionPending && (
                  <PromotionDialog color={state.color} onPick={confirmPromotion} />
                )}
              </div>
            </div>

            <PlayerCard
              username={myUsername}
              color={state.color}
              timeMs={myMs}
              isActive={isMyTurn}
            />

            {/* Result strip — mobile only (desktop gets sidebar banner) */}
            {isOver && (
              <div className={`og-result-strip ${stripClass}`}>
                <span>{resultText}</span>
                {state.endReason && (
                  <span className="og-result-reason">· {formatReason(state.endReason)}</span>
                )}
              </div>
            )}

            {/* Horizontal moves strip — mobile only */}
            <div className="og-moves-strip" aria-label="Move history">
              <MoveList moves={moveListData} noAutoScroll horizontal />
            </div>

            {/* 4-button action row — mobile only */}
            <div className="og-action-row" role="toolbar" aria-label="Game actions">
              <button className="og-action-btn" aria-label="Previous move" onClick={seekPrev} disabled={atStart}>‹</button>
              <button className="og-action-btn" aria-label="Next move"     onClick={seekNext} disabled={atEnd}>›</button>
              {isOver ? (
                <button className="og-action-btn" aria-label="New game" onClick={handleNewGame}>↺</button>
              ) : (
                // TODO: open chat sheet when socket chat is implemented
                <button className="og-action-btn" aria-label="Chat — coming soon" disabled>💬</button>
              )}
              <button
                className="og-action-btn"
                aria-label="More options"
                onClick={() => setSheetOpen(true)}
              >
                ⋯
              </button>
            </div>

            {/* Chat peek — mobile only. TODO: show last message when backend chat is wired. */}
          </>
        ) : null}
      </main>

      {/* ── Right side panel (desktop only, hidden on mobile via CSS) ── */}
      <aside className="og-side-panel" aria-label="Game panel">
        {(isPlaying || isOver) && (
          <>
            {isOver && (
              <div className={`og-result-banner ${resultClass}`}>
                {resultText}
                {state.endReason && (
                  <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.75 }}>
                    {' '}· {formatReason(state.endReason)}
                  </span>
                )}
              </div>
            )}

            <section className="og-panel og-panel--moves" aria-label="Move history">
              <div className="og-panel__header">
                <span className="og-panel__label">Moves</span>
                <div className="og-nav-btns">
                  <button className="og-nav-btn" aria-label="First move"    onClick={seekFirst} disabled={atStart}>⏮</button>
                  <button className="og-nav-btn" aria-label="Previous move" onClick={seekPrev}  disabled={atStart}>◀</button>
                  <button className="og-nav-btn" aria-label="Next move"     onClick={seekNext}  disabled={atEnd}>▶</button>
                  <button className="og-nav-btn" aria-label="Last move"     onClick={seekLast}  disabled={atEnd}>⏭</button>
                </div>
              </div>
              <div className="og-panel__body">
                <MoveList
                  moves={moveListData}
                  onSeek={(_, index) => setSeekIndex(index)}
                  currentIndex={seekIndex !== null ? seekIndex : state.moves.length - 1}
                  noAutoScroll={isReviewing}
                />
              </div>
            </section>

            <section className="og-panel og-panel--chat" aria-label="Chat">
              <div className="og-panel__label">Chat</div>
              <div className="og-chat__messages">
                {chatMessages.length === 0 ? (
                  <span className="og-chat__empty">No messages yet</span>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i}>
                      <span className={`og-chat__sender og-chat__sender--${msg.own ? 'me' : 'opp'}`}>
                        {msg.sender}:
                      </span>{' '}
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              {/* TODO: wire onSubmit to socket.emit('chat_message', { text }) when backend is ready */}
              <form className="og-chat__input-row" onSubmit={handleSendChat}>
                <input
                  className="og-chat__input"
                  placeholder="Say something…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  aria-label="Chat message"
                />
                <button type="submit" className="og-chat__send" aria-label="Send">→</button>
              </form>
            </section>

            <div className="og-actions">
              {isPlaying && (
                <>
                  <button className="og-side-btn" onClick={() => setDrawOpen(true)}>
                    ½ Draw
                  </button>
                  <button className="og-side-btn og-side-btn--danger" onClick={() => setResignOpen(true)}>
                    ⚐ Resign
                  </button>
                </>
              )}
              {isOver && (
                <button className="og-side-btn og-side-btn--accent" onClick={handleNewGame}>
                  New game
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── Mobile bottom sheet ── */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onFlip={() => setFlipped((f) => !f)}
        onResign={() => setResignOpen(true)}
        onOfferDraw={() => setDrawOpen(true)}
      />

      {/* ── Idle: choose time control ── */}
      {state.status === 'idle' && (
        <div className="og-overlay" role="dialog" aria-label="Find a game">
          <div className="og-card">
            <p className="og-card-title">Choose time control</p>
            {state.error && <p className="og-error-text">{state.error}</p>}
            <div className="og-tc-grid">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc}
                  className={`og-tc-btn${tc === timeControl ? ' og-tc-btn-active' : ''}`}
                  onClick={() => setTimeControl(tc)}
                >
                  {tc}
                </button>
              ))}
            </div>
            <button className="og-find-btn" onClick={joinMatchmaking}>
              Find a game
            </button>
          </div>
        </div>
      )}

      {/* ── Waiting for opponent / reconnecting ── */}
      {state.status === 'waiting' && (
        <div className="og-overlay" role="status" aria-live="polite">
          <div className="og-card">
            <div className="og-spinner" aria-hidden="true" />
            <p className="og-card-title">
              {state.reconnecting ? 'Reconnecting…' : 'Waiting for opponent'}
            </p>
            <p className="og-card-sub">
              {state.reconnecting
                ? 'Restoring your game session…'
                : `Looking for a ${timeControl} game…`}
            </p>
            {!state.reconnecting && (
              <button className="og-cancel-link" onClick={() => navigate('/')}>Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* ── Abort confirmation (navigating away mid-game) ── */}
      {abortOpen && (
        <div className="og-overlay" role="alertdialog" aria-label="Leave game?">
          <div className="og-card">
            <p className="og-card-title">Leave game?</p>
            <p className="og-dialog-body">
              The other player will win if you leave. This counts as a resignation.
            </p>
            <div className="og-dialog-actions">
              <button className="og-dialog-cancel" onClick={() => setAbortOpen(false)}>
                Stay
              </button>
              <button className="og-dialog-confirm" onClick={handleAbortConfirm}>
                Forfeit &amp; leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resign confirmation ── */}
      {resignOpen && (
        <div className="og-overlay" role="alertdialog" aria-label="Resign?">
          <div className="og-card">
            <p className="og-card-title">Resign?</p>
            <p className="og-dialog-body">
              You will lose this game. Are you sure you want to resign?
            </p>
            <div className="og-dialog-actions">
              <button className="og-dialog-cancel" onClick={() => setResignOpen(false)}>
                Keep playing
              </button>
              <button className="og-dialog-confirm" onClick={handleResignConfirm}>
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Draw offer confirmation ── */}
      {drawOpen && (
        <div className="og-overlay" role="alertdialog" aria-label="Offer draw?">
          <div className="og-card">
            <p className="og-card-title">Offer draw?</p>
            <p className="og-dialog-body">
              Send a draw offer to your opponent. They can accept or decline.
            </p>
            <div className="og-dialog-actions">
              <button className="og-dialog-cancel" onClick={() => setDrawOpen(false)}>
                Cancel
              </button>
              <button
                className="og-dialog-confirm og-dialog-confirm--warning"
                onClick={() => {
                  // TODO: socket.emit('offer_draw') when backend is ready
                  setDrawOpen(false)
                }}
              >
                Send offer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Promotion dialog (absolute overlay inside og-board-inner) ─

const PIECES: { piece: PromotionPiece; white: string; black: string; label: string }[] = [
  { piece: 'q', white: '♕', black: '♛', label: 'Queen' },
  { piece: 'r', white: '♖', black: '♜', label: 'Rook' },
  { piece: 'b', white: '♗', black: '♝', label: 'Bishop' },
  { piece: 'n', white: '♘', black: '♞', label: 'Knight' },
]

function PromotionDialog({
  color,
  onPick,
}: {
  color: 'white' | 'black'
  onPick: (piece: PromotionPiece) => void
}) {
  return (
    <div className="og-promo-backdrop">
      <div className="og-promo-box">
        <p className="og-promo-label">Promote pawn to:</p>
        <div className="og-promo-grid">
          {PIECES.map(({ piece, white, black, label }) => (
            <button
              key={piece}
              className="og-promo-btn"
              onClick={() => onPick(piece)}
              aria-label={label}
            >
              <span className="og-promo-symbol" aria-hidden="true">
                {color === 'white' ? white : black}
              </span>
              <span className="og-promo-name">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function formatReason(reason: string): string {
  return reason.replace(/_/g, ' ')
}
