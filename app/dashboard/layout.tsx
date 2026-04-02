import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FilterProvider } from '@/lib/filters'
import FilterBar from './components/FilterBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get latest week for initial state
  const { data: latestWeek } = await supabase
    .from('weekly_metrics')
    .select('week_start')
    .eq('marketplace', 'ALL')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const initialWeek = latestWeek?.week_start || ''

  return (
    <FilterProvider initialWeek={initialWeek}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </FilterProvider>
  )
}
