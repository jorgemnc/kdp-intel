'use client'
interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: number
  accent?: string
  mono?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function MetricCard({ label, value, sub, delta, accent, mono, size = 'md' }: MetricCardProps) {
  const valueSizes = { sm: 20, md: 28, lg: 36 }
  const valueSize = valueSizes[size]

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: valueSize,
          fontWeight: 700,
          color: accent || 'var(--text)',
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          {value}
        </span>
        {delta !== undefined && (
          <span style={{
            fontSize: 12,
            color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontFamily: 'var(--font-mono)',
          }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
