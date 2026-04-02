'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import MetricCard from './MetricCard'
import type { WeeklyMetrics } from '@/lib/types'
import { MARKETPLACE_CONFIG } from '@/lib/game-theory'

export default function OverviewTab() {
  const { filters } = useFilters()
  const [metrics, setMetrics] = useState<WeeklyMetrics[]>([])
  const [history, setHistory] = useState<WeeklyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!filters.weekStart) return
    fetchData()
  }, [filters.weekStart, filters.marketplace])

  async function fetchData() {
    setLoading(true)
    // Current week metrics
    let q = supabase.from('weekly_metrics').select('*').eq('week_start', filters.weekStart)
    if (filters.marketplace !== 'ALL') q = q.eq('marketplace', filters.marketplace)
    const { data: curr } = await q
    setMetrics(curr || [])

    // History (last 12 weeks)
    const { data: hist } = await supabase
      .from('weekly_metrics')
      .select('*')
      .order('week_start', { ascending: true })
      .limit(36) // 12 weeks × 3 marketplaces
    setHistory(hist || [])
    setLoading(false)
  }

  const es = metrics.find(m => m.marketplace === 'ES')
  const com = metrics.find(m => m.marketplace === 'COM')
  const all = metrics.find(m => m.marketplace === 'ALL')

  // Build chart data
  const histAll = history.filter(h => h.marketplace === 'ALL')
  const histES = history.filter(h => h.marketplace === 'ES')
  const histCOM = history.filter(h => h.marketplace === 'COM')

  const chartData = histAll.map(h => {
    const esRow = histES.find(e => e.week_start === h.week_start)
    const comRow = histCOM.find(c => c.week_start === h.week_start)
    return {
      week: h.week_label,
      'Índice': h.strategic_index,
      'Spend ES (€)': esRow?.total_spend || 0,
      'Sales ES (€)': esRow?.total_sales || 0,
      'Spend COM ($)': comRow?.total_spend || 0,
      'Sales COM ($)': comRow?.total_sales || 0,
      'Royalties ES': esRow?.royalties || 0,
      'Royalties COM': comRow?.royalties || 0,
    }
  })

  const showES = filters.marketplace === 'ALL' || filters.marketplace === 'ES'
  const showCOM = filters.marketplace === 'ALL' || filters.marketplace === 'COM'

  if (loading) return <LoadingState />

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Global Book Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <MetricCard label="Libros en catálogo" value={all?.books_total ?? '—'} size="lg" accent="var(--text)" />
        <MetricCard label="Con campaña (global)" value={all?.books_with_campaign ?? '—'} accent="var(--accent-green)" />
        <MetricCard label="Sin campaña (global)" value={all?.books_without_campaign ?? '—'} accent="var(--accent-red)" />
        <MetricCard label="Índice estratégico" value={`${all?.strategic_index ?? '—'}/100`} accent={all ? indexColor(all.strategic_index) : 'var(--text)'} mono />
      </div>

      {/* ES Metrics */}
      {showES && es && (
        <section>
          <SectionHeader flag="🇪🇸" label="AMAZON.ES" color="var(--accent-amber)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <MetricCard label="Royalties semana" value={es.royalties > 0 ? `€${es.royalties.toFixed(2)}` : '—'} accent="var(--accent-green)" />
            <MetricCard label="Ventas Ads" value={es.total_sales > 0 ? `€${es.total_sales.toFixed(2)}` : '—'} />
            <MetricCard label="Gasto Ads" value={es.total_spend > 0 ? `€${es.total_spend.toFixed(2)}` : '—'} accent="var(--accent-amber)" />
            <MetricCard label="ACOS" value={es.acos > 0 ? `${(es.acos * 100).toFixed(1)}%` : '—'} accent={es.acos > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)'} mono />
            <MetricCard label="Clicks" value={es.total_clicks.toLocaleString()} />
            <MetricCard label="Pedidos" value={es.total_orders} accent="var(--accent-green)" />
            <MetricCard label="Con campaña" value={es.books_with_campaign} accent="var(--accent-green)" />
            <MetricCard label="Sin campaña" value={es.books_without_campaign} accent="var(--accent-red)" />
          </div>
        </section>
      )}

      {/* COM Metrics */}
      {showCOM && com && (
        <section>
          <SectionHeader flag="🇺🇸" label="AMAZON.COM" color="var(--accent)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <MetricCard label="Royalties semana" value={com.royalties > 0 ? `$${com.royalties.toFixed(2)}` : '—'} accent="var(--accent-green)" />
            <MetricCard label="Ventas Ads" value={com.total_sales > 0 ? `$${com.total_sales.toFixed(2)}` : '—'} />
            <MetricCard label="Gasto Ads" value={com.total_spend > 0 ? `$${com.total_spend.toFixed(2)}` : '—'} accent="var(--accent-amber)" />
            <MetricCard label="ACOS" value={com.acos > 0 ? `${(com.acos * 100).toFixed(1)}%` : '—'} accent={com.acos > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)'} mono />
            <MetricCard label="Clicks" value={com.total_clicks.toLocaleString()} />
            <MetricCard label="Pedidos" value={com.total_orders} accent="var(--accent-green)" />
            <MetricCard label="Con campaña" value={com.books_with_campaign} accent="var(--accent-green)" />
            <MetricCard label="Sin campaña" value={com.books_without_campaign} accent="var(--accent-red)" />
          </div>
        </section>
      )}

      {/* Strategic Index History */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
            ÍNDICE ESTRATÉGICO — HISTÓRICO
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIdx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4da6ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4da6ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="Índice" stroke="#4da6ff" fill="url(#colorIdx)" strokeWidth={2} dot={{ fill: '#4da6ff', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spend vs Sales chart */}
      {chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: showES && showCOM ? '1fr 1fr' : '1fr', gap: 16 }}>
          {showES && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', letterSpacing: '0.1em', marginBottom: 16 }}>
                🇪🇸 GASTO VS VENTAS (EUR)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                  <Area type="monotone" dataKey="Sales ES (€)" stroke="#1ec97e" fill="#1ec97e20" strokeWidth={2} />
                  <Area type="monotone" dataKey="Spend ES (€)" stroke="#e8971e" fill="#e8971e20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {showCOM && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 16 }}>
                🇺🇸 GASTO VS VENTAS (USD)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                  <Area type="monotone" dataKey="Sales COM ($)" stroke="#1ec97e" fill="#1ec97e20" strokeWidth={2} />
                  <Area type="monotone" dataKey="Spend COM ($)" stroke="#4da6ff" fill="#4da6ff20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {metrics.length === 0 && !loading && (
        <EmptyState />
      )}
    </div>
  )
}

function SectionHeader({ flag, label, color }: { flag: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{flag}</span>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, letterSpacing: '0.15em', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card" style={{ padding: 20, height: 80, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sin datos para esta semana</div>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        Ejecuta la tarea de Cowork para importar los datos del lunes.
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
