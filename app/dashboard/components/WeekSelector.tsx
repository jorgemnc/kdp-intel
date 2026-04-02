'use client'
import { useFilters } from '@/lib/filters'
import type { WeekOption } from '@/lib/types'

interface WeekSelectorProps {
  weeks: WeekOption[]
}

export default function WeekSelector({ weeks }: WeekSelectorProps) {
  const { filters, setWeekStart } = useFilters()

  if (weeks.length === 0) return (
    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
      Sin datos
    </div>
  )

  const current = weeks.find(w => w.week_start === filters.weekStart) || weeks[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>SEMANA</span>
      <select
        value={filters.weekStart}
        onChange={e => setWeekStart(e.target.value)}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text)', borderRadius: 4, padding: '4px 8px',
          fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', outline: 'none',
        }}
      >
        {weeks.map(w => (
          <option key={w.week_start} value={w.week_start}>
            {w.week_label} · {w.strategic_index}/100
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 10px' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>IDX</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: indexColor(current?.strategic_index || 0), fontFamily: 'var(--font-mono)' }}>
          {current?.strategic_index ?? '—'}/100
        </span>
      </div>
    </div>
  )
}

function indexColor(idx: number) {
  if (idx >= 70) return 'var(--accent-green)'
  if (idx >= 50) return 'var(--accent)'
  if (idx >= 30) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}
