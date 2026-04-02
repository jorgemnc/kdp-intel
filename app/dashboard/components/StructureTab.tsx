'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import type { CampaignSnapshot, CampaignBookMapping, BookCatalog } from '@/lib/types'

interface CampaignWithBooks extends CampaignSnapshot {
  books: Array<{ asin: string; title?: string; ad_group: string; status: string }>
  bookCount: number
  anomalies: string[]
}

export default function StructureTab() {
  const { filters } = useFilters()
  const [campaigns, setCampaigns] = useState<CampaignWithBooks[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!filters.weekStart) return
    fetchData()
  }, [filters.weekStart, filters.marketplace, filters.campaignType, filters.campaignStatus])

  async function fetchData() {
    setLoading(true)

    let cq = supabase.from('campaigns_snapshot').select('*').eq('week_start', filters.weekStart)
    if (filters.marketplace !== 'ALL') cq = cq.eq('marketplace', filters.marketplace)
    if (filters.campaignType !== 'ALL') cq = cq.eq('campaign_type', filters.campaignType)
    if (filters.campaignStatus !== 'ALL') cq = cq.eq('status', filters.campaignStatus)
    const { data: camps } = await cq

    let mq = supabase.from('campaign_book_mapping').select('*, books_catalog(title)').eq('week_start', filters.weekStart)
    if (filters.marketplace !== 'ALL') mq = mq.eq('marketplace', filters.marketplace)
    const { data: mappings } = await mq

    const enriched: CampaignWithBooks[] = (camps || []).map(c => {
      const cBooks = (mappings || []).filter(m => m.campaign_id === c.campaign_id && m.marketplace === c.marketplace)
      const anomalies: string[] = []
      if (c.campaign_type === 'AUTO' && cBooks.length > 10) anomalies.push(`🔴 Campaña auto con ${cBooks.length} libros (demasiado genérica)`)
      if (c.acos > 0.9 && c.spend > 0) anomalies.push(`🔴 ACOS crítico: ${(c.acos * 100).toFixed(0)}%`)
      if (c.sales === 0 && c.spend > 0) anomalies.push(`🟡 Sin ventas con gasto registrado`)
      if (c.status === 'paused' && cBooks.length > 0) anomalies.push(`⚪ Campaña pausada con ${cBooks.length} libros activos`)

      return {
        ...c,
        books: cBooks.map(m => ({
          asin: m.asin,
          title: (m as any).books_catalog?.title,
          ad_group: m.ad_group_name || '',
          status: m.status || '',
        })),
        bookCount: cBooks.length,
        anomalies,
      }
    })

    // Sort: anomalies first, then by spend
    enriched.sort((a, b) => {
      if (a.anomalies.length > 0 && b.anomalies.length === 0) return -1
      if (b.anomalies.length > 0 && a.anomalies.length === 0) return 1
      return b.spend - a.spend
    })

    setCampaigns(enriched)
    setLoading(false)
  }

  // Global anomaly detection: books in 3+ campaigns
  const asinCampaignCount = useMemo(() => {
    const counts: Record<string, number> = {}
    campaigns.forEach(c => c.books.forEach(b => {
      counts[b.asin] = (counts[b.asin] || 0) + 1
    }))
    return counts
  }, [campaigns])

  const cannibalized = Object.entries(asinCampaignCount).filter(([, v]) => v > 3)

  const anomalyCount = campaigns.filter(c => c.anomalies.length > 0).length
  const totalBooks = new Set(campaigns.flatMap(c => c.books.map(b => b.asin))).size

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatCard label="Total campañas" value={campaigns.length} />
        <StatCard label="Libros en ads" value={totalBooks} color="var(--accent)" />
        <StatCard label="Con anomalías" value={anomalyCount} color={anomalyCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
        <StatCard label="Canibalización" value={cannibalized.length} color={cannibalized.length > 0 ? 'var(--accent-amber)' : 'var(--accent-green)'} />
      </div>

      {/* Cannibalization alert */}
      {cannibalized.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#1a1500', border: '1px solid #3a2d00', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', marginBottom: 6, letterSpacing: '0.1em' }}>
            🟡 POSIBLE CANIBALIZACIÓN — Libros en 3+ campañas simultáneas
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cannibalized.map(([asin, count]) => (
              <span key={asin} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {asin} ({count} camps)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campaigns.map(c => (
            <div key={`${c.marketplace}-${c.campaign_id}`} className="card" style={{ overflow: 'hidden' }}>
              {/* Campaign header */}
              <button
                onClick={() => setExpandedId(expandedId === c.campaign_id ? null : c.campaign_id)}
                style={{
                  width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', width: 16 }}>
                  {expandedId === c.campaign_id ? '▼' : '▶'}
                </span>

                {/* Marketplace badge */}
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: c.marketplace === 'ES' ? '#e8971e' : '#4da6ff', minWidth: 28 }}>
                  {c.marketplace === 'ES' ? '🇪🇸' : '🇺🇸'}
                </span>

                {/* Type badge */}
                <span style={{
                  padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  background: c.campaign_type === 'AUTO' ? '#2a1e0a' : '#0a1a2a',
                  color: c.campaign_type === 'AUTO' ? '#e8971e' : '#4da6ff',
                  border: `1px solid ${c.campaign_type === 'AUTO' ? '#3a2a0a' : '#0a2a3a'}`,
                  minWidth: 52, textAlign: 'center',
                }}>
                  {c.campaign_type}
                </span>

                {/* Name */}
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.campaign_name}
                </span>

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                  <Metric label="Libros" value={c.bookCount} />
                  <Metric label="ACOS" value={c.acos > 0 ? `${(c.acos * 100).toFixed(1)}%` : '—'} color={c.acos > 0.5 ? 'var(--accent-red)' : c.acos > 0.35 ? 'var(--accent-amber)' : 'var(--accent-green)'} />
                  <Metric label="Gasto" value={c.spend > 0 ? `${c.marketplace === 'ES' ? '€' : '$'}${c.spend.toFixed(0)}` : '—'} />
                  <Metric label="Ventas" value={c.sales > 0 ? `${c.marketplace === 'ES' ? '€' : '$'}${c.sales.toFixed(0)}` : '—'} color="var(--accent-green)" />
                  <span style={{
                    padding: '3px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-mono)',
                    background: c.status === 'enabled' ? '#0a2a1a' : '#1a1a1a',
                    color: c.status === 'enabled' ? '#1ec97e' : '#6b7592',
                    border: `1px solid ${c.status === 'enabled' ? '#1e3a1e' : '#2a2a2a'}`,
                  }}>
                    {c.status}
                  </span>
                </div>

                {/* Anomaly indicators */}
                {c.anomalies.length > 0 && (
                  <span style={{ fontSize: 16 }} title={c.anomalies.join('\n')}>⚠️</span>
                )}
              </button>

              {/* Expanded content */}
              {expandedId === c.campaign_id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background: 'var(--bg-elevated)' }}>
                  {/* Anomalies */}
                  {c.anomalies.length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {c.anomalies.map((a, i) => (
                        <div key={i} style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>{a}</div>
                      ))}
                    </div>
                  )}

                  {/* Books in campaign */}
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
                    LIBROS EN ESTA CAMPAÑA ({c.bookCount})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {c.books.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Sin libros registrados</span>
                    ) : c.books.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '5px 0', borderBottom: i < c.books.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', minWidth: 100 }}>{b.asin}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{b.title || 'Título no encontrado'}</span>
                        {b.ad_group && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{b.ad_group}</span>}
                        {asinCampaignCount[b.asin] > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>🟡 {asinCampaignCount[b.asin]} camps</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Budget */}
                  <div style={{ marginTop: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    Presupuesto diario: {c.daily_budget ? `${c.marketplace === 'ES' ? '€' : '$'}${c.daily_budget.toFixed(2)}` : '—'} ·
                    Inicio: {c.start_date || '—'} ·
                    Impresiones: {(c.impressions || 0).toLocaleString()} ·
                    Clicks: {(c.clicks || 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 50 }}>
      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏗</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Sin estructura de campañas</div>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 8 }}>
        Ejecuta la tarea de Cowork para importar los datos.
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(5)].map((_, i) => <div key={i} className="card" style={{ height: 56 }} />)}
    </div>
  )
}
