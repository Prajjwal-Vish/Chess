import { useEffect, useRef } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'

interface ChessboardProps {
  config: Config
  onReady?: (api: Api) => void
  width?: number | string
}

export default function Chessboard({
  config,
  onReady,
  width = '100%',
}: ChessboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)

  // Mount Chessground once
  useEffect(() => {
    if (!containerRef.current) return
    const api = Chessground(containerRef.current, config)
    apiRef.current = api
    onReady?.(api)

    return () => {
      api.destroy()
    }
  }, []) // intentionally empty — we control updates manually below

  // Sync config changes after mount
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set(config)
    }
  }, [config])

  return (
    <div
      style={{
        width,
        aspectRatio: '1 / 1',
        position: 'relative',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}