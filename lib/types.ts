export type Marketplace = 'ES' | 'COM' | 'ALL'
export type CampaignType = 'AUTO' | 'MANUAL' | 'ALL' | 'MIXED'
export type CampaignStatus = 'enabled' | 'paused' | 'archived' | 'ALL'
export type NashPosition = 'OPORTUNIDAD' | 'EQUILIBRIO' | 'TENSIÓN' | 'GUERRA' | 'RETIRADA'
export type CoverageStatus = 'sin_campaña' | 'nueva' | 'solo_auto' | 'solo_manual' | 'mixta'

export interface FilterState {
  marketplace: Marketplace
  campaignType: CampaignType
  campaignStatus: CampaignStatus
  weekStart: string
  compareWeek: string | null
}

export interface BookCatalog {
  id: string
  asin_es: string | null
  asin_com: string | null
  title: string
  niche: string | null
  publish_date: string | null
  status: string
  notes: string | null
  first_seen_at: string
  updated_at: string
}

export interface BookWeeklyData {
  id: string
  book_id: string
  week_start: string
  marketplace: 'ES' | 'COM'
  price: number | null
  bsr: number | null
  reviews_count: number | null
  reviews_avg: number | null
  in_stock: boolean
  scraped_at: string
}

export interface CampaignSnapshot {
  id: string
  week_start: string
  marketplace: 'ES' | 'COM'
  campaign_id: string
  campaign_name: string
  campaign_type: 'AUTO' | 'MANUAL'
  targeting_type: string | null
  status: string
  daily_budget: number | null
  start_date: string | null
  impressions: number
  clicks: number
  orders: number
  spend: number
  sales: number
  acos: number
}

export interface CampaignBookMapping {
  id: string
  week_start: string
  marketplace: 'ES' | 'COM'
  campaign_id: string
  campaign_name: string
  campaign_type: 'AUTO' | 'MANUAL'
  asin: string
  book_id: string | null
  ad_group_name: string | null
  status: string
}

export interface BookCoverage {
  id: string
  week_start: string
  marketplace: 'ES' | 'COM'
  book_id: string
  asin: string
  has_any_campaign: boolean
  has_auto_campaign: boolean
  has_manual_campaign: boolean
  campaign_count: number
  total_spend: number
  total_sales: number
  total_orders: number
  acos: number | null
  coverage_status: CoverageStatus
  weeks_published: number | null
}

export interface KeywordSnapshot {
  id: string
  week_start: string
  marketplace: 'ES' | 'COM'
  keyword: string
  campaign_id: string | null
  impressions: number
  clicks: number
  orders: number
  spend: number
  sales: number
  cpc: number
  acos: number
  cr: number
  position: NashPosition
  target_bid: number
  nash_bid: number
  bid_gap: number
  profit: number
}

export interface WeeklyMetrics {
  id: string
  week_start: string
  marketplace: 'ES' | 'COM' | 'ALL'
  week_label: string
  total_spend: number
  total_sales: number
  total_clicks: number
  total_orders: number
  total_impressions: number
  royalties: number
  acos: number
  avg_cr: number
  strategic_index: number
  books_total: number
  books_with_campaign: number
  books_without_campaign: number
}

export interface AIRecommendation {
  category: 'keywords' | 'campaign_structure' | 'catalog_coverage'
  marketplace: 'ES' | 'COM' | 'AMBOS'
  title: string
  action: string
  reasoning: string
  priority: 'alta' | 'media' | 'baja'
  impact: string
  affected_books?: string[]
  affected_campaigns?: string[]
}

export interface AIRecommendations {
  id: string
  week_start: string
  strategic_index: number | null
  recommendations: AIRecommendation[]
  raw_context: Record<string, unknown> | null
  created_at: string
}

export interface WeekOption {
  week_start: string
  week_label: string
  strategic_index: number
}
