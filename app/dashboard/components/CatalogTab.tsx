'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import type { BookCatalog, BookCoverage, BookWeeklyData } from '@/lib/types'
import { coverageColor, coverageLabel } from '@/lib/game-theory'
import type { CoverageStatus } from '@/lib/types'

interface EnrichedBook extends BookCatalog {
  coverage_es?: BookCoverage
  coverage_com?: BookCoverage
  weekly_es?: BookWeeklyData
  weekly_com?: BookWeeklyData
  prev_weekly_es?: BookWeeklyData
  prev_weekly_com?: BookWeeklyData
}

const PAGE_SIZE = 20

export default function CatalogTab() {
  const { filters } = useFilters()
  const [books, setBooks] = useState<EnrichedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<'title' | 'bsr_es' | 'bsr_com' | 'publish_date'>('publish_date')
  const [filterCoverage, setFilterCoverage] = useState<CoverageStatus | 'ALL'>('ALL')
  const supabase = createClient()

  useEffect(() => {
    if (!filters.weekStart) return
    fetchData()
  }, [filters.weekStart, filters.marketplace])

  async function fetchData() {
    setLoading(true)

    const { data: catalogData } = await supabase.from('books_catalog').select('*').neq('status', 'draft')
    if (!catalogData) { setLoading(false); return }

    const bookIds = catalogData.map(b => b.id)

    const [{ data: coverageData }, { data: weeklyData }] = await Promise.all([
      supabase.from('book_coverage').select('*').eq('week_start', filters.weekStart).in('book_id', bookIds),
      supabase.from('book_weekly_data').select('*').eq('week_start', filters.weekStart).in('book_id', bookIds),
    ])

    // Previous week for delta
    const prevDate = getPrevWeek(filters.weekStart)
    const { data: prevWeekly } = prevDate
      ? await supabase.from('book_weekly_data').select('*').eq('week_start', prevDate).in('book_id', bookIds)
      : { data: [] }

    const enriched: EnrichedBook[] = catalogData.map(b => ({
      ...b,
      coverage_es: (coverageData || []).find(c => c.book_id === b.id && c.marketplace === 'ES'),
      coverage_com: (coverageData || []).find(c => c.book_id === b.id && c.marketplace === 'COM'),
      weekly_es: (weeklyData || []).find(w => w.book_id === b.id && w.marketplace === 'ES'),
      weekly_com: (weeklyData || []).find(w => w.book_id === b.id && w.marketplace === 'COM'),
      prev_weekly_es: (prevWeekly || []).find(w => w.book_id === b.id && w.marketplace === 'ES'),
      prev_weekly_com: (prevWeekly || []).find(w => w.book_id === b.id && w.marketplace === 'COM'),
    }))

    setBooks(enriched)
    setPage(0)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = books

    if (filters.marketplace === 'ES') result = result.filter(b => b.asin_es)
    if (filters.marketplace === 'COM') result = result.filter(b => b.asin_com)

    if (filterCoverage !== 'ALL') {
      result = result.filter(b => {
        if (filters.marketplace === 'COM') return b.coverage_com?.coverage_status === filterCoverage
        return b.coverage_es?.coverage_status === filterCoverage
      })
    }

    return [...result].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'publish_date') return (b.publish_date || '').localeCompare(a.publish_date || '')
      if (sort === 'bsr_es') return (a.weekly_es?.bsr || 999999) - (b.weekly_es?.bsr || 999999)
      if (sort === 'bsr_com') return (a.weekly_com?.bsr || 999999) - (b.weekly_com?.bsr || 999999)
      return 0
    })
  }, [books, sort, filterCoverage, filters.marketplace])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const showES = filters.marketplace === 'ALL' || filters.marketplace === 'ES'
  const showCOM = filters.marketplace === 'ALL' || filters.marketplace === 'COM'

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <SortSelect value={sort} onChange={setSort} />
        <CoverageFilter value={filterCoverage} onChange={setFilterCoverage} />
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          {filtered.length} libros
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Título</th>
              {showES && <th style={th}>ASIN .es</th>}
              {showCOM && <th style={th}>ASIN .com</th>}
              <th style={th}>Publicado</th>
              {showES && <th style={th}>BSR .es</th>}
              {showCOM && <th style={th}>BSR .com</th>}
              {showES && <th style={th}>Precio .es</th>}
              {showCOM && <th style={th}>Precio .com</th>}
              {showES && <th style={th}>Cobertura ES</th>}
              {showCOM && <th style={th}>Cobertura COM</th>}
              <th style={th}>Gasto sem.</th>
              <th style={th}>ACOS sem.</th>
              <th style={th}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={20} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Sin libros</td></tr>
            ) : paged.map(b => {
              const weeksPublished = b.publish_date
                ? Math.floor((Date.now() - new Date(b.publish_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
                : null

              const totalSpend = (b.coverage_es?.total_spend || 0) + (b.coverage_com?.total_spend || 0)
              const totalSales = (b.coverage_es?.total_sales || 0) + (b.coverage_com?.total_sales || 0)
              const acos = totalSales > 0 ? totalSpend / totalSales : null

              const coverageES = b.coverage_es?.coverage_status
              const coverageCOM = b.coverage_com?.coverage_status
              const action = suggestAction(coverageES, coverageCOM, acos)

              return (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', fontSize: 13, color: 'var(--text)', maxWidth: 220 }}>
                    <span title={b.title}>{b.title.length > 32 ? b.title.slice(0, 30) + '…' : b.title}</span>
                    {weeksPublished !== null && weeksPublished <= 4 && (
                      <span style={{ marginLeft: 6, ...pillSm, background: '#0a1a2a', color: '#4da6ff', border: '1px solid #1e2a3a' }}>NUEVA</span>
                    )}
                  </td>
                  {showES && (
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                      {b.asin_es ? (
                        <a href={`https://www.amazon.es/dp/${b.asin_es}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {b.asin_es}
                        </a>
                      ) : '—'}
                    </td>
                  )}
                  {showCOM && (
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                      {b.asin_com ? (
                        <a href={`https://www.amazon.com/dp/${b.asin_com}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {b.asin_com}
                        </a>
                      ) : '—'}
                    </td>
                  )}
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {weeksPublished !== null ? `${weeksPublished} sem` : '—'}
                  </td>
                  {showES && <BSRCell current={b.weekly_es?.bsr} prev={b.prev_weekly_es?.bsr} />}
                  {showCOM && <BSRCell current={b.weekly_com?.bsr} prev={b.prev_weekly_com?.bsr} />}
                  {showES && <td style={tdMono}>{b.weekly_es?.price ? `€${b.weekly_es.price}` : '—'}</td>}
                  {showCOM && <td style={tdMono}>{b.weekly_com?.price ? `$${b.weekly_com.price}` : '—'}</td>}
                  {showES && <CoveragePill status={coverageES} />}
                  {showCOM && <CoveragePill status={coverageCOM} />}
                  <td style={tdMono}>{totalSpend > 0 ? `${totalSpend.toFixed(2)}` : '—'}</td>
                  <td style={{ ...tdMono, color: acos ? (acos > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)') : 'var(--text-dim)' }}>
                    {acos ? `${(acos * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <ActionBadge action={action} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <PageBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</PageBtn>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            {page + 1} / {totalPages}
          </span>
          <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente →</PageBtn>
        </div>
      )}
    </div>
  )
}

function BSRCell({ current, prev }: { current?: number | null; prev?: number | null }) {
  const delta = current && prev ? prev - current : null // positive = improved (lower BSR)
  return (
    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>
      {current ? (
        <span>
          #{current.toLocaleString()}
          {delta !== null && (
            <span style={{ fontSize: 10, marginLeft: 4, color: delta > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {delta > 0 ? '▲' : '▼'}
            </span>
          )}
        </span>
      ) : '—'}
    </td>
  )
}

function CoveragePill({ status }: { status?: CoverageStatus }) {
  if (!status) return <td style={{ padding: '9px 14px' }}><span style={{ ...pillSm, background: '#1a1a1a', color: '#6b7592', border: '1px solid #2a2a2a' }}>—</span></td>
  const color = coverageColor(status)
  return (
    <td style={{ padding: '9px 14px' }}>
      <span style={{ ...pillSm, background: `${color}18`, color, border: `1px solid ${color}40` }}>
        {coverageLabel(status)}
      </span>
    </td>
  )
}

function ActionBadge({ action }: { action: { icon: string; label: string; color: string } }) {
  return (
    <span style={{ ...pillSm, background: `${action.color}18`, color: action.color, border: `1px solid ${action.color}40` }}>
      {action.icon} {action.label}
    </span>
  )
}

function suggestAction(es?: CoverageStatus, com?: CoverageStatus, acos?: number | null) {
  if (!es && !com) return { icon: '➕', label: 'Sin campaña', color: '#f43f5e' }
  if ((es === 'sin_campaña') || (com === 'sin_campaña')) return { icon: '➕', label: 'Añadir campaña', color: '#f43f5e' }
  if ((es === 'solo_auto') || (com === 'solo_auto')) return { icon: '⬆', label: 'Migrar a manual', color: '#e8971e' }
  if (acos && acos > 0.6) return { icon: '🔴', label: 'Revisar ACOS', color: '#f43f5e' }
  return { icon: '✓', label: 'OK', color: '#1ec97e' }
}

function getPrevWeek(weekStart: string): string | null {
  if (!weekStart) return null
  const d = new Date(weekStart)
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function SortSelect({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ORDENAR</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
        <option value="publish_date">Más reciente</option>
        <option value="title">Título A→Z</option>
        <option value="bsr_es">BSR .es</option>
        <option value="bsr_com">BSR .com</option>
      </select>
    </div>
  )
}

function CoverageFilter({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>COBERTURA</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
        <option value="ALL">Todas</option>
        <option value="sin_campaña">Sin campaña</option>
        <option value="nueva">Nueva</option>
        <option value="solo_auto">Solo auto</option>
        <option value="solo_manual">Solo manual</option>
        <option value="mixta">Mixta</option>
      </select>
    </div>
  )
}

function PageBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '5px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 4, color: disabled ? 'var(--text-muted)' : 'var(--text)',
      fontSize: 12, fontFamily: 'var(--font-mono)', cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      {children}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div className="card" style={{ height: 400 }} />
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 10,
  fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.06em', whiteSpace: 'nowrap',
}
const tdMono: React.CSSProperties = {
  padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap',
}
const pillSm: React.CSSProperties = {
  display: 'inline-block', padding: '2px 6px', borderRadius: 3,
  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const selectStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text)', borderRadius: 4, padding: '4px 8px',
  fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', outline: 'none',
}
