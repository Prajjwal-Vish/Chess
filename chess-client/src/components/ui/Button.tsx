interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'ghost'
}

export default function Button({
  children,
  loading,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      style={{
        padding: '11px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        border: isPrimary ? 'none' : '1px solid var(--border)',
        background: isPrimary ? 'var(--accent)' : 'transparent',
        color: isPrimary ? '#fff' : 'var(--text)',
        width: '100%',
        transition: 'opacity 0.15s',
        ...props.style,
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
