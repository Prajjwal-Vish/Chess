interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--text-h)',
      }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          padding: '10px 14px',
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          borderRadius: '8px',
          fontSize: '16px',
          background: 'var(--bg)',
          color: 'var(--text-h)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <span style={{ fontSize: '13px', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}