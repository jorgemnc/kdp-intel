'use client'
import { useFilters } from '@/lib/filters'
import type { Marketplace, CampaignType, CampaignStatus } from '@/lib/types'

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 4,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#000' : 'var(--text-dim)',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'all 0.15s',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function PillGroup<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginRight: 2, textTransform: 'uppercase' }}>
        {label}
      </span>
      {options.map(opt => (
        <Pill key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </Pill>
      ))}
    </div>
  )
}

export default function FilterBar() {
  const { filters, setMarketplace, setCampaignType, setCampaignStatus } = useFilters()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, padding: '10px 24px',
      borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
      flexWrap: 'wrap',
    }}>
      <PillGroup<Marketplace>
        label="Mercado"
        value={filters.marketplace}
        onChange={setMarketplace}
        options={[
          { value: 'ALL', label: '🌐 Todos' },
          { value: 'ES', label: '🇪🇸 ES' },
          { value: 'COM', label: '🇺🇸 COM' },
        ]}
      />
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <PillGroup<CampaignType>
        label="Tipo"
        value={filters.campaignType}
        onChange={setCampaignType}
        options={[
          { value: 'ALL', label: 'Todos' },
          { value: 'AUTO', label: 'Auto' },
          { value: 'MANUAL', label: 'Manual' },
        ]}
      />
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <PillGroup<CampaignStatus>
        label="Estado"
        value={filters.campaignStatus}
        onChange={setCampaignStatus}
        options={[
          { value: 'ALL', label: 'Todos' },
          { value: 'enabled', label: 'Activas' },
          { value: 'paused', label: 'Pausadas' },
        ]}
      />
    </div>
  )
}
