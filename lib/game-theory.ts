import type { NashPosition, KeywordSnapshot } from './types'

export const MARKETPLACE_CONFIG = {
  ES: { TARGET_ACOS: 0.35, AVG_PRICE: 8.99, AVG_ROYALTY: 6.29, symbol: '€', currency: 'EUR' },
  COM: { TARGET_ACOS: 0.35, AVG_PRICE: 9.99, AVG_ROYALTY: 6.99, symbol: '$', currency: 'USD' },
} as const

export type MarketplaceKey = keyof typeof MARKETPLACE_CONFIG

export function enrichKeyword(
  keyword: {
    clicks: number
    orders: number
    spend: number
    sales: number
    cpc: number
    impressions: number
  },
  marketplace: MarketplaceKey
) {
  const config = MARKETPLACE_CONFIG[marketplace]
  const { clicks, orders, spend, sales, cpc } = keyword

  const cr = clicks > 0 ? orders / clicks : 0
  const acos = sales > 0 ? spend / sales : 1
  const target_bid = config.TARGET_ACOS * cr * config.AVG_PRICE
  const nash_bid = cr * config.AVG_ROYALTY
  const bid_gap = target_bid > 0 ? ((target_bid - cpc) / target_bid) * 100 : 0
  const profit = sales * (config.AVG_ROYALTY / config.AVG_PRICE) - spend

  const position = classifyPosition(acos, config.TARGET_ACOS)

  return { cr, acos, target_bid, nash_bid, bid_gap, profit, position }
}

export function classifyPosition(acos: number, targetAcos: number): NashPosition {
  if (acos > 0.90) return 'RETIRADA'
  if (acos > 0.60) return 'GUERRA'
  if (acos > targetAcos * 1.15) return 'TENSIÓN'
  if (acos >= targetAcos * 0.80) return 'EQUILIBRIO'
  return 'OPORTUNIDAD'
}

export function computeStrategicIndex(keywords: Pick<KeywordSnapshot, 'position' | 'spend'>[]): number {
  if (keywords.length === 0) return 0

  const weights: Record<NashPosition, number> = {
    OPORTUNIDAD: 100,
    EQUILIBRIO: 80,
    TENSIÓN: 40,
    GUERRA: 10,
    RETIRADA: 0,
  }

  const totalSpend = keywords.reduce((s, k) => s + (k.spend || 0), 0)
  if (totalSpend === 0) {
    // Equal weight
    const avg = keywords.reduce((s, k) => s + weights[k.position], 0) / keywords.length
    return Math.round(avg)
  }

  // Spend-weighted
  const weighted = keywords.reduce((s, k) => s + weights[k.position] * (k.spend || 0), 0)
  return Math.round(weighted / totalSpend)
}

export function classifyBookCoverage(
  hasAuto: boolean,
  hasManual: boolean,
  weeksPublished: number
): import('./types').CoverageStatus {
  const hasAny = hasAuto || hasManual
  if (!hasAny && weeksPublished <= 4) return 'nueva'
  if (!hasAny) return 'sin_campaña'
  if (hasAuto && hasManual) return 'mixta'
  if (hasAuto) return 'solo_auto'
  return 'solo_manual'
}

export function formatCurrency(value: number, marketplace: MarketplaceKey): string {
  const config = MARKETPLACE_CONFIG[marketplace]
  return `${config.symbol}${value.toFixed(2)}`
}

export function positionColor(position: NashPosition): string {
  const colors: Record<NashPosition, string> = {
    OPORTUNIDAD: '#1ec97e',
    EQUILIBRIO: '#4da6ff',
    TENSIÓN: '#e8971e',
    GUERRA: '#f43f5e',
    RETIRADA: '#6b7280',
  }
  return colors[position]
}

export function coverageColor(status: import('./types').CoverageStatus): string {
  const colors: Record<import('./types').CoverageStatus, string> = {
    sin_campaña: '#f43f5e',
    nueva: '#4da6ff',
    solo_auto: '#e8971e',
    solo_manual: '#1ec97e',
    mixta: '#1ec97e',
  }
  return colors[status]
}

export function coverageLabel(status: import('./types').CoverageStatus): string {
  const labels: Record<import('./types').CoverageStatus, string> = {
    sin_campaña: 'SIN CAMPAÑA',
    nueva: 'NUEVA',
    solo_auto: 'SOLO AUTO',
    solo_manual: 'SOLO MANUAL',
    mixta: 'MIXTA',
  }
  return labels[status]
}
