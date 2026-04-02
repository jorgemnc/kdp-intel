'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import type { AIRecommendations, AIRecommendation } from '@/lib/types'

const CATEGORIES = [
  { key: 'keywords', label: '🔑 Keywords', desc: 'Optimización de bids y targeting' },
  { key: 'campaign_structure', label: '🏗 Estructura', desc: 'Reorganización de campañas' },
  { key: 'catalog_coverage', label: '📚 Cobertura', desc: 'Libros sin campaña y expansión' },
] as const

export default function StrategyTab() {
  const { filters } = useFilters()
  const [current, setCurrent] = useState<AIRecommendations | null>(null)
  const [history, setHistory] = useState<AIRecommendations[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('keywords')
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!filters.weekStart) return
    fetchData()
  }, [filters.weekStart])

  async function fetchData() {
    setLoading(true)

    const { data: curr } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('week_start', filters.weekStart)
      .single()

    const { data: hist } = await supabase
      .from('ai_recommendations')
      .select('*')
      .neq('week_start', filters.weekStart)
      .order('week_start', { ascending: false })
      .limit(4)

    setCurrent(curr || null)
    setHistory(hist || [])
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  const recs = current?.recommendations || []
  const filtered = recs.filter(r => {
    if (activeCategory === 'all') return true
    return r.category === activeCategory
  })

  const countByCategory = {
    keywords: recs.filter(r => r.category === 'keywords').length,
    campaign_structure: recs.filter(r => r.category === 'campaign_structure').length,
    catalog_coverage: recs.filter(r => r.category === 'catalog_coverage').length,
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with strategic index */}
      {current && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 4 }}>ÍNDICE ESTRATÉGICO GLOBAL</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: indexColor(current.strategic_index || 0), fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {current.strategic_index ?? '—'}<span style={{ fontSize: 18, opacity: 0.6 }}>/100</span>
            </div>
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            {Object.entries(countByCategory).map(([cat, count]) => (
              <div key={cat} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{count}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {cat === 'keywords' ? 'Keywords' : cat === 'campaign_structure' ? 'Estructura' : 'Cobertura'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {recs.filter(r => r.priority === 'alta').length > 0 && (
              <PriorityBadge priority="alta" count={recs.filter(r => r.priority === 'alta').length} />
            )}
            {recs.filter(r => r.priority === 'media').length > 0 && (
              <PriorityBadge priority="media" count={recs.filter(r => r.priority === 'media').length} />
            )}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
            padding: '8px 20px', background: 'none', border: 'none',
            borderBottom: activeCategory === cat.key ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeCategory === cat.key ? 'var(--text)' : 'var(--text-dim)',
            fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: -1,
            display: 'flex', gap: 6, alignItems: 'center',
          }}>
            {cat.label}
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: activeCategory === cat.key ? '#4da6ff20' : 'var(--bg-elevated)', color: activeCategory === cat.key ? 'var(--accent)' : 'var(--text-dim)' }}>
              {countByCategory[cat.key as keyof typeof countByCategory]}
            </span>
          </button>
        ))}
      </div>

      {/* Recommendations */}
      {!current ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Sin recomendaciones en esta categoría
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.sort((a, b) => priorityOrder(b.priority) - priorityOrder(a.priority)).map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      )}

      {/* Historical */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 12 }}>
            HISTORIAL DE RECOMENDACIONES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map(h => (
              <div key={h.week_start} className="card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedHistory(expandedHistory === h.week_start ? null : h.week_start)}
                  style={{
                    width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{expandedHistory === h.week_start ? '▼' : '▶'}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)', flex: 1, textAlign: 'left' }}>
                    Semana {h.week_start}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: indexColor(h.strategic_index || 0), fontFamily: 'var(--font-mono)' }}>
                    {h.strategic_index ?? '—'}/100
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {h.recommendations?.length || 0} recs
                  </span>
                </button>
                {expandedHistory === h.week_start && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(h.recommendations || []).slice(0, 4).map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <PriorityDot priority={r.priority} />
                        <div>
                          <span style={{ fontSize: 12, color: 'var(--text)' }}>{r.title}</span>
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{r.marketplace}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = rec.priority === 'alta' ? '#f43f5e' : rec.priority === 'media' ? '#e8971e' : '#4da6ff'

  return (
    <div style={{ border: `1px solid var(--border)`, borderLeft: `3px solid ${borderColor}`, borderRadius: 6, background: 'var(--bg-card)', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rec.title}</span>
            <span style={{ ...pillStyle, background: '#0a1a2a', color: '#4da6ff', border: '1px solid #1e2a3a' }}>
              {rec.marketplace}
            </span>
            <PriorityBadge priority={rec.priority} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{rec.action}</div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', background: 'var(--bg-elevated)' }}>
          <Detail label="Razonamiento estratégico" value={rec.reasoning} />
          <Detail label="Impacto esperado" value={rec.impact} />
          {rec.affected_books && rec.affected_books.length > 0 && (
            <Detail label="Libros afectados" value={rec.affected_books.join(', ')} />
          )}
          {rec.affected_campaigns && rec.affected_campaigns.length > 0 && (
            <Detail label="Campañas afectadas" value={rec.affected_campaigns.join(', ')} />
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

function PriorityBadge({ priority, count }: { priority: string; count?: number }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    alta: { bg: '#2a0a0e', color: '#f43f5e', border: '#3a1020' },
    media: { bg: '#2a1e0a', color: '#e8971e', border: '#3a2a0a' },
    baja: { bg: '#0a1a2a', color: '#4da6ff', border: '#0a2a3a' },
  }
  const s = styles[priority] || styles.baja
  return (
    <span style={{ ...pillStyle, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {count !== undefined ? `${count} ${priority}` : priority}
    </span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { alta: '#f43f5e', media: '#e8971e', baja: '#4da6ff' }
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[priority] || '#6b7592', marginTop: 4, flexShrink: 0 }} />
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Sin análisis para esta semana</div>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 8 }}>
        Cowork generará las recomendaciones automáticamente el lunes.
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[...Array(4)].map((_, i) => <div key={i} className="card" style={{ height: 90 }} />)}
    </div>
  )
}

function indexColor(idx: number) {
  if (idx >= 70) return 'var(--accent-green)'
  if (idx >= 50) return 'var(--accent)'
  if (idx >= 30) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function priorityOrder(p: string) {
  return p === 'alta' ? 3 : p === 'media' ? 2 : 1
}

const pillStyle: React.CSSProperties = {
  display: 'inline-block', padding: '2px 7px', borderRadius: 3,
  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
}
