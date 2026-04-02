'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import FilterBar from './components/FilterBar'
import WeekSelector from './components/WeekSelector'
import OverviewTab from './components/OverviewTab'
import CampaignsTab from './components/CampaignsTab'
import CatalogTab from './components/CatalogTab'
import StructureTab from './components/StructureTab'
import StrategyTab from './components/StrategyTab'
import UploadBackup from './components/UploadBackup'
import type { WeekOption } from '@/lib/types'

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'campaigns', label: 'Campañas' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'structure', label: 'Estructura' },
  { id: 'strategy', label: '🧠 Estrategia' },
  { id: 'upload', label: '⬆ Backup' },
] as const

type TabId = typeof TABS[number]['id']

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [weeks, setWeeks] = useState<WeekOption[]>([])
  const { filters, setWeekStart } = useFilters()
  const supabase = createClient()

  useEffect(() => {
    fetchWeeks()
  }, [])

  async function fetchWeeks() {
    const { data } = await supabase
      .from('weekly_metrics')
      .select('week_start, week_label, strategic_index')
      .eq('marketplace', 'ALL')
      .order('week_start', { ascending: false })
      .limit(26)
    const opts: WeekOption[] = (data || []).map(d => ({
      week_start: d.week_start,
      week_label: d.week_label,
      strategic_index: d.strategic_index,
    }))
    setWeeks(opts)
    if (opts.length > 0 && !filters.weekStart) {
      setWeekStart(opts[0].week_start)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 20, padding: '12px 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-card)',
        position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap',
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
            KDP INTELLIGENCE · TEORÍA DE JUEGOS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>STEVE ALLEN ◆</span>
            <span style={{ padding: '1px 7px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', background: '#1a2a1a', color: 'var(--accent-amber)', border: '1px solid #2a3a1a' }}>🇪🇸 ES</span>
            <span style={{ padding: '1px 7px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', background: '#0a1a2a', color: 'var(--accent)', border: '1px solid #0a2a3a' }}>🇺🇸 COM</span>
          </div>
        </div>

        {/* Center: FilterBar */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 300 }}>
          <InlineFilterBar />
        </div>

        {/* Right: WeekSelector + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <WeekSelector weeks={weeks} />
          <button
            onClick={handleSignOut}
            style={{
              padding: '5px 12px', background: 'none', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text-dim)', fontSize: 11,
              fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >
            SALIR
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-dim)',
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: -1, transition: 'color 0.15s',
              letterSpacing: '0.01em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'structure' && <StructureTab />}
        {activeTab === 'strategy' && <StrategyTab />}
        {activeTab === 'upload' && <UploadBackup />}
      </main>
    </div>
  )
}

// Inline FilterBar (simplified for header)
function InlineFilterBar() {
  const { filters, setMarketplace, setCampaignType, setCampaignStatus } = useFilters()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {([
        { label: '🌐', value: 'ALL', field: 'marketplace' },
        { label: '🇪🇸 ES', value: 'ES', field: 'marketplace' },
        { label: '🇺🇸 COM', value: 'COM', field: 'marketplace' },
      ] as const).map(opt => (
        <button key={opt.value} onClick={() => setMarketplace(opt.value as any)} style={{
          padding: '3px 10px', borderRadius: 3, border: filters.marketplace === opt.value ? 'none' : '1px solid var(--border)',
          background: filters.marketplace === opt.value ? 'var(--accent)' : 'transparent',
          color: filters.marketplace === opt.value ? '#000' : 'var(--text-dim)',
          fontSize: 11, fontWeight: filters.marketplace === opt.value ? 700 : 500,
          fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{opt.label}</button>
      ))}
      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
      {(['AUTO', 'MANUAL', 'ALL'] as const).map(v => (
        <button key={v} onClick={() => setCampaignType(v)} style={{
          padding: '3px 10px', borderRadius: 3, border: filters.campaignType === v ? 'none' : '1px solid var(--border)',
          background: filters.campaignType === v ? 'var(--border-accent)' : 'transparent',
          color: filters.campaignType === v ? 'var(--text)' : 'var(--text-dim)',
          fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
        }}>{v === 'ALL' ? 'TODOS' : v}</button>
      ))}
    </div>
  )
}
