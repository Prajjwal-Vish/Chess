// handles the message slider in mobile interface

import { useEffect } from 'react'
import './BottomSheet.css'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onFlip: () => void
  onResign: () => void
  onOfferDraw: () => void
}

export default function BottomSheet({
  isOpen,
  onClose,
  onFlip,
  onResign,
  onOfferDraw,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`bs-overlay${isOpen ? ' bs-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bs-sheet${isOpen ? ' bs-sheet--open' : ''}`}
        role="dialog"
        aria-label="Game options"
        aria-modal="true"
        // inert hides content from keyboard/AT when sheet is closed
        inert={!isOpen ? true : undefined}
      >
        <div className="bs-handle" aria-hidden="true" />
        <span className="bs-section-label">Game options</span>

        <button
          className="bs-item"
          onClick={() => { onFlip(); onClose(); }}
        >
          <span className="bs-icon" aria-hidden="true">↻</span>
          Flip board
        </button>

        <div className="bs-divider" role="separator" />

        <button
          className="bs-item bs-item--warning"
          onClick={() => { onOfferDraw(); onClose(); }}
        >
          <span className="bs-icon" aria-hidden="true">½</span>
          Offer draw
        </button>
        <button
          className="bs-item bs-item--danger"
          onClick={() => { onResign(); onClose(); }}
        >
          <span className="bs-icon" aria-hidden="true">⚐</span>
          Resign
        </button>
      </div>
    </>
  )
}
