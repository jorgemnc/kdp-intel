'use client'
import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useFilters } from '@/lib/filters'
import type { CampaignSnapshot, KeywordSnapshot } from '@/lib/types'
import { positionColor, coverageLabel, MARKETPLACE_CONFIG } from '@/lib/game-theory'
import type { NashPosition } from '@/lib/types'

const NASH_POSITIONS: NashPosition[] = ['OPORTUNIDAD', 'EQUILIBRIO', 'TENSIÓN', 'GUERRA', 'RETIRADA']

export default function CampaignsTab() {
  const { filters } = useFilters()
  const [campaigns, setCampaigns] = useState<CampaignSnapshot[]>([])
  const [keywords, setKeywords] = useState<KeywordSnapshot[]>([])
  const [activeSubTab, setActiveSubTab] = useState<'campañas' | 'keywords'>('campañas')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!filters.weekStart) return
    fetchData()
  }, [filters.weekStart, filters.marketplace, filters.campaignType, filters.campaignStatus])

  async function fetchData() {
    setLoading(true)

    // Campaigns
    let cq = supabase.from('campaigns_snapshot').select('*').eq('week_start', filters.weekStart)
    if (filters.marketplace !== 'ALL') cq = cq.eq('marketplace', filters.marketplace)
    if (filters.campaignType !== 'ALL') cq = cq.eq('campaign_type', filters.campaignType)
    if (filters.campaignStatus !== 'ALL') cq = cq.eq('status', filters.campaignStatus)
    const { data: camps } = await cq.order('spend', { ascending: false }).limit(100)
    setCampaigns(camps || [])

    // Keywords
    let kq = supabase.from('keyword_snapshots').select('*').eq('week_start', filters.weekStart)
    if (filters.marketplace !== 'ALL') kq = kq.eq('marketplace', filters.marketplace)
    const { data: kws } = await kq.order('spend', { ascending: false }).limit(200)
    setKeywords(kws || [])

    setLoading(false)
  }

  const scatterData = campaigns.map(c => ({
    x: c.impressions,
    y: c.acos * 100,
    name: c.campaign_name,
    spend: c.spend,
    type: c.campaign_type,
    status: c.status,
  }))

  const top8Keywords = keywords.slice(0, 8)
  const barData = top8Keywords.map(k => ({
    keyword: k.keyword.length > 20 ? k.keyword.slice(0, 18) + '…' : k.keyword,
    'CPC Actual': +k.cpc.toFixed(2),
    'Bid Objetivo': +k.target_bid.toFixed(2),
    'Nash Max': +k.nash_bid.toFixed(2),
    position: k.position,
  }))

  const posCounts = NASH_POSITIONS.reduce((acc, p) => {
    acc[p] = keywords.filter(k => k.position === p).length
    return acc
  }, {} as Record<NashPosition, number>)

  const isES = filters.marketplace === 'ES' || filters.marketplace === 'ALL'
  const isCOM = filters.marketplace === 'COM' || filters.marketplace === 'ALL'

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {(['campañas', 'keywords'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} style={{
            padding: '8px 20px', background: 'none', border: 'none',
            borderBottom: activeSubTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeSubTab === tab ? 'var(--text)' : 'var(--text-dim)',
            fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            cursor: 'pointer', textTransform: 'uppercase', marginBottom: -1,
          }}>
            {tab} {tab === 'keywords' && `(${keywords.length})`}
          </button>
        ))}
      </div>

      {activeSubTab === 'campañas' && (
        <>
          {/* Nash Position Summary */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {NASH_POSITIONS.map(pos => (
              <div key={pos} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                background: 'var(--bg-card)', border: `1px solid ${positionColor(pos)}40`,
                borderRadius: 4,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: positionColor(pos) }} />
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{pos}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: positionColor(pos), fontFamily: 'var(--font-mono)' }}>{posCounts[pos]}</span>
              </div>
            ))}
          </div>

          {/* Scatter Chart */}
          {scatterData.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
                CAMPAÑAS — IMPRESIONES VS ACOS (%)
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name="Impresiones" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <YAxis dataKey="y" name="ACOS %" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
                    formatter={(value: number, name: string) => [
                      name === 'ACOS %' ? `${value.toFixed(1)}%` : value.toLocaleString(), name
                    ]}
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{d?.name}</div>
                          <div style={{ color: 'var(--text-dim)' }}>ACOS: {d?.y?.toFixed(1)}%</div>
                          <div style={{ color: 'var(--text-dim)' }}>Impresiones: {d?.x?.toLocaleString()}</div>
                          <div style={{ color: 'var(--text-dim)' }}>Gasto: {d?.spend?.toFixed(2)}</div>
                          <div style={{ color: d?.type === 'AUTO' ? 'var(--accent-amber)' : 'var(--accent)' }}>{d?.type} · {d?.status}</div>
                        </div>
                      )
                    }}
                  />
                  <Scatter
                    data={scatterData}
                    fill="var(--accent)"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props
                      const color = payload.type === 'AUTO' ? '#e8971e' : '#4da6ff'
                      const r = Math.max(4, Math.min(12, (payload.spend || 0) / 2))
                      return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <LegendDot color="#e8971e" label="AUTO" />
                <LegendDot color="#4da6ff" label="MANUAL" />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Tamaño = gasto</span>
              </div>
            </div>
          )}

          {/* Campaigns Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Campaña', 'Tipo', 'Mercado', 'Estado', 'ACOS', 'Gasto', 'Ventas', 'Pedidos', 'Presupuesto/día'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Sin campañas para esta semana</td></tr>
                ) : campaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '9px 14px', fontSize: 13, color: 'var(--text)', maxWidth: 200 }}>
                      <span title={c.campaign_name}>{c.campaign_name.length > 28 ? c.campaign_name.slice(0, 26) + '…' : c.campaign_name}</span>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ ...pillStyle, background: c.campaign_type === 'AUTO' ? '#2a1e0a' : '#0a1a2a', color: c.campaign_type === 'AUTO' ? '#e8971e' : '#4da6ff', border: `1px solid ${c.campaign_type === 'AUTO' ? '#3a2a0a' : '#0a2a3a'}` }}>
                        {c.campaign_type}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{c.marketplace}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ ...pillStyle, background: c.status === 'enabled' ? '#0a2a1a' : '#1a1a1a', color: c.status === 'enabled' ? '#1ec97e' : '#6b7592', border: `1px solid ${c.status === 'enabled' ? '#1e3a1e' : '#2a2a2a'}` }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: c.acos > 0.5 ? 'var(--accent-red)' : c.acos > 0.35 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                      {c.acos > 0 ? `${(c.acos * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>
                      {c.spend > 0 ? `${c.marketplace === 'ES' ? '€' : '$'}${c.spend.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-green)' }}>
                      {c.sales > 0 ? `${c.marketplace === 'ES' ? '€' : '$'}${c.sales.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-dim)' }}>{c.orders || '—'}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-dim)' }}>
                      {c.daily_budget ? `${c.marketplace === 'ES' ? '€' : '$'}${c.daily_budget.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSubTab === 'keywords' && (
        <>
          {/* Nash Bid Chart */}
          {barData.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
                TOP KEYWORDS — CPC vs BID OBJETIVO vs NASH MAX
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="keyword" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} width={120} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-dim)' }} />
                  <Bar dataKey="CPC Actual" fill="#4da6ff" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="Bid Objetivo" fill="#e8971e" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="Nash Max" fill="#1ec97e" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Keywords Table */}
          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Keyword', 'Mercado', 'Posición Nash', 'ACOS', 'CPC', 'Bid Obj.', 'Nash Max', 'Gap %', 'Profit', 'Clicks', 'Pedidos', 'CR'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.length === 0 ? (
                  <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Sin keywords para esta semana</td></tr>
                ) : keywords.map(k => (
                  <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text)', maxWidth: 200 }}>
                      <span title={k.keyword}>{k.keyword.length > 30 ? k.keyword.slice(0, 28) + '…' : k.keyword}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{k.marketplace}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ ...pillStyle, background: `${positionColor(k.position)}20`, color: positionColor(k.position), border: `1px solid ${positionColor(k.position)}40` }}>
                        {k.position}
                      </span>
                    </td>
                    <MonoCell v={`${(k.acos * 100).toFixed(1)}%`} color={k.acos > 0.6 ? 'var(--accent-red)' : k.acos > 0.35 ? 'var(--accent-amber)' : 'var(--accent-green)'} />
                    <MonoCell v={`€${k.cpc.toFixed(2)}`} />
                    <MonoCell v={`€${k.target_bid.toFixed(2)}`} color="var(--accent-amber)" />
                    <MonoCell v={`€${k.nash_bid.toFixed(2)}`} color="var(--accent-green)" />
                    <MonoCell v={`${k.bid_gap.toFixed(1)}%`} color={k.bid_gap > 20 ? 'var(--accent-green)' : k.bid_gap < -20 ? 'var(--accent-red)' : 'var(--text-dim)'} />
                    <MonoCell v={k.profit > 0 ? `€${k.profit.toFixed(2)}` : `−€${Math.abs(k.profit).toFixed(2)}`} color={k.profit > 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
                    <MonoCell v={k.clicks.toLocaleString()} />
                    <MonoCell v={k.orders} />
                    <MonoCell v={`${(k.cr * 100).toFixed(1)}%`} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const pillStyle: React.CSSProperties = {
  display: 'inline-block', padding: '2px 7px', borderRadius: 3,
  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
}

function MonoCell({ v, color }: { v: string | number; color?: string }) {
  return (
    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: color || 'var(--text-dim)', whiteSpace: 'nowrap' }}>
      {v}
    </td>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card" style={{ height: 50 }} />
      ))}
    </div>
  )
}
