import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DateRange } from '@/types/dashboard'

interface DashboardStore {
  selectedDC:    string
  dateRange:     DateRange
  isDarkMode:    boolean
  setSelectedDC: (dc: string)           => void
  setDateRange:  (range: DateRange)     => void
  toggleDarkMode: ()                    => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      selectedDC:  'dc-a',
      dateRange:   '30d',
      isDarkMode:  false,
      setSelectedDC:  (dc)    => set({ selectedDC: dc }),
      setDateRange:   (range) => set({ dateRange: range }),
      toggleDarkMode: ()      => set(s => {
        const next = !s.isDarkMode
        if (next) document.documentElement.classList.add('dark')
        else      document.documentElement.classList.remove('dark')
        return { isDarkMode: next }
      }),
    }),
    {
      name: 'smartretail-dashboard',
      onRehydrateStorage: () => (state) => {
        if (state?.isDarkMode) document.documentElement.classList.add('dark')
      },
    },
  ),
)
