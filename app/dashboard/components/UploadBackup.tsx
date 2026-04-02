'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FILE_TYPES = [
  { value: 'search_terms_es', label: 'Search Terms ES (.csv)' },
  { value: 'search_terms_com', label: 'Search Terms COM (.csv)' },
  { value: 'bulk_ops_es', label: 'Bulk Operations ES (.xlsx/.csv)' },
  { value: 'bulk_ops_com', label: 'Bulk Operations COM (.xlsx/.csv)' },
  { value: 'kdp_titles', label: 'KDP All Titles Report (.csv)' },
  { value: 'kdp_royalties', label: 'KDP Royalties Report (.csv)' },
] as const

export default function UploadBackup() {
  const [type, setType] = useState<string>(FILE_TYPES[0].value)
  const [weekStart, setWeekStart] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' })

  async function handleUpload() {
    if (!file || !weekStart || !type) { setStatus({ type: 'error', msg: 'Completa todos los campos' }); return }
    setStatus({ type: 'loading', msg: 'Procesando...' })

    try {
      const supabase = createClient()
      const reader = new FileReader()

      reader.onload = async (e) => {
        const content = e.target?.result as string
        const rows = parseCSV(content)

        if (type === 'kdp_titles') {
          await processKdpTitles(supabase, rows, weekStart)
        } else if (type === 'search_terms_es' || type === 'search_terms_com') {
          await processSearchTerms(supabase, rows, weekStart, type.includes('es') ? 'ES' : 'COM')
        }

        setStatus({ type: 'success', msg: `✅ ${rows.length} filas procesadas correctamente` })
        setFile(null)
      }

      reader.readAsText(file)
    } catch (err: any) {
      setStatus({ type: 'error', msg: `Error: ${err.message}` })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 20 }}>
        CARGA MANUAL DE ARCHIVOS — BACKUP PARA CUANDO COWORK NO EJECUTA
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type selector */}
          <div>
            <label style={labelStyle}>TIPO DE ARCHIVO</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {FILE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
          </div>

          {/* Week start */}
          <div>
            <label style={labelStyle}>SEMANA (LUNES)</label>
            <input
              type="date"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* File upload */}
          <div>
            <label style={labelStyle}>ARCHIVO</label>
            <input
              type="file"
              accept=".csv,.xlsx,.tsv"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            />
            {file && (
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', marginTop: 4 }}>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Status */}
          {status.type !== 'idle' && (
            <div style={{
              padding: '8px 12px', borderRadius: 5, fontSize: 12, fontFamily: 'var(--font-mono)',
              background: status.type === 'error' ? '#1a0a0e' : status.type === 'success' ? '#0a1a0e' : 'var(--bg-elevated)',
              color: status.type === 'error' ? 'var(--accent-red)' : status.type === 'success' ? 'var(--accent-green)' : 'var(--text-dim)',
              border: `1px solid ${status.type === 'error' ? '#3a1020' : status.type === 'success' ? '#1e3a1e' : 'var(--border)'}`,
            }}>
              {status.msg}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={status.type === 'loading' || !file || !weekStart}
            style={{
              padding: '10px 20px', background: 'var(--accent)', border: 'none', borderRadius: 5,
              color: '#000', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: (status.type === 'loading' || !file || !weekStart) ? 'not-allowed' : 'pointer',
              opacity: (status.type === 'loading' || !file || !weekStart) ? 0.5 : 1,
              letterSpacing: '0.05em',
            }}
          >
            {status.type === 'loading' ? 'PROCESANDO...' : 'SUBIR Y PROCESAR'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 8 }}>NOTAS</div>
        <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            'Usar solo si la tarea automática de Cowork no ejecutó correctamente',
            'El archivo CSV debe tener encabezados en la primera fila',
            'El procesamiento básico se realiza en el navegador (solo campos esenciales)',
            'Para un procesamiento completo con métricas Nash, ejecutar Cowork manualmente',
          ].map((note, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--text-dim)' }}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

async function processKdpTitles(supabase: any, rows: Record<string, string>[], weekStart: string) {
  const byTitle: Record<string, any> = {}
  for (const row of rows) {
    const title = row['Title'] || row['title'] || ''
    if (!title) continue
    const marketplace = row['Marketplace'] || row['marketplace'] || ''
    const asin = row['ASIN'] || row['asin'] || ''
    if (!byTitle[title]) byTitle[title] = { title, asin_es: null, asin_com: null, publish_date: row['Publication Date'] || null, niche: row['Primary Category'] || null, status: 'active' }
    if (marketplace.includes('ES') || marketplace.includes('es')) byTitle[title].asin_es = asin
    if (marketplace.includes('US') || marketplace.includes('com')) byTitle[title].asin_com = asin
  }

  for (const book of Object.values(byTitle)) {
    const conflict = book.asin_es ? 'asin_es' : 'asin_com'
    await supabase.from('books_catalog').upsert(book, { onConflict: conflict, ignoreDuplicates: false })
  }
}

async function processSearchTerms(supabase: any, rows: Record<string, string>[], weekStart: string, marketplace: 'ES' | 'COM') {
  const config = marketplace === 'ES'
    ? { TARGET_ACOS: 0.35, AVG_PRICE: 8.99, AVG_ROYALTY: 6.29 }
    : { TARGET_ACOS: 0.35, AVG_PRICE: 9.99, AVG_ROYALTY: 6.99 }

  const upserts = []
  for (const row of rows) {
    const keyword = row['Customer Search Term'] || row['Search Term'] || ''
    if (!keyword) continue
    const clicks = parseInt(row['Clicks'] || '0')
    const orders = parseInt(row['7 Day Total Orders (#)'] || row['Orders'] || '0')
    const spend = parseFloat(row['Spend'] || '0')
    const sales = parseFloat(row['7 Day Total Sales'] || '0')
    const cpc = parseFloat(row['Cost Per Click'] || '0')
    const impressions = parseInt(row['Impressions'] || '0')
    const cr = clicks > 0 ? orders / clicks : 0
    const acos = sales > 0 ? spend / sales : 1
    const target_bid = config.TARGET_ACOS * cr * config.AVG_PRICE
    const nash_bid = cr * config.AVG_ROYALTY
    const bid_gap = target_bid > 0 ? ((target_bid - cpc) / target_bid) * 100 : 0
    const profit = sales * (config.AVG_ROYALTY / config.AVG_PRICE) - spend
    let position = 'OPORTUNIDAD'
    if (acos > 0.90) position = 'RETIRADA'
    else if (acos > 0.60) position = 'GUERRA'
    else if (acos > config.TARGET_ACOS * 1.15) position = 'TENSIÓN'
    else if (acos >= config.TARGET_ACOS * 0.80) position = 'EQUILIBRIO'
    upserts.push({ week_start: weekStart, marketplace, keyword, campaign_id: row['Campaign Name'] || null, impressions, clicks, orders, spend, sales, cpc, acos, cr, position, target_bid, nash_bid, bid_gap, profit })
  }

  if (upserts.length > 0) {
    await supabase.from('keyword_snapshots').upsert(upserts, { onConflict: 'week_start,marketplace,keyword,campaign_id' })
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
  letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)',
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
}
