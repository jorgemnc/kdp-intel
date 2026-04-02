'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import type { FilterState, Marketplace, CampaignType, CampaignStatus } from './types'

const DEFAULT_FILTERS: FilterState = {
  marketplace: 'ALL',
  campaignType: 'ALL',
  campaignStatus: 'ALL',
  weekStart: '',
  compareWeek: null,
}

interface FilterContextValue {
  filters: FilterState
  setMarketplace: (v: Marketplace) => void
  setCampaignType: (v: CampaignType) => void
  setCampaignStatus: (v: CampaignStatus) => void
  setWeekStart: (v: string) => void
  setCompareWeek: (v: string | null) => void
}

export const FilterContext = createContext<FilterContextValue>({
  filters: DEFAULT_FILTERS,
  setMarketplace: () => {},
  setCampaignType: () => {},
  setCampaignStatus: () => {},
  setWeekStart: () => {},
  setCompareWeek: () => {},
})

export function FilterProvider({ children, initialWeek }: { children: React.ReactNode; initialWeek?: string }) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    weekStart: initialWeek || '',
  })

  const setMarketplace = useCallback((v: Marketplace) => setFilters(f => ({ ...f, marketplace: v })), [])
  const setCampaignType = useCallback((v: CampaignType) => setFilters(f => ({ ...f, campaignType: v })), [])
  const setCampaignStatus = useCallback((v: CampaignStatus) => setFilters(f => ({ ...f, campaignStatus: v })), [])
  const setWeekStart = useCallback((v: string) => setFilters(f => ({ ...f, weekStart: v })), [])
  const setCompareWeek = useCallback((v: string | null) => setFilters(f => ({ ...f, compareWeek: v })), [])

  return (
    <FilterContext.Provider value={{ filters, setMarketplace, setCampaignType, setCampaignStatus, setWeekStart, setCompareWeek }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
