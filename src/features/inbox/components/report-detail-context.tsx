import { createContext, useContext, useRef, type MouseEvent, type ReactNode } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { detailBackgroundKey } from '@/components/layout/detail-route'

type ReportDetailContextValue = {
  reportId: string | null
  open: boolean
  openReport: (id: string, trigger?: HTMLElement | null, fallback?: HTMLElement | null) => void
  closeReport: () => void
  returnFocus: () => HTMLElement | null
}

const ReportDetailContext = createContext<ReportDetailContextValue | null>(null)

export function ReportDetailProvider({ children }: { children: ReactNode }) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const fallbackRef = useRef<HTMLElement | null>(null)
  const triggerKey = useRef<string | undefined>(undefined)
  const location = useLocation()
  const navigate = useNavigate()
  const reportId = matchPath('/app/reports/:reportId', location.pathname)?.params.reportId ?? null
  const backgroundKey = detailBackgroundKey(location.state)

  function openReport(id: string, trigger?: HTMLElement | null, fallback?: HTMLElement | null) {
    triggerRef.current = trigger ?? null
    fallbackRef.current = fallback ?? null
    triggerKey.current = trigger?.dataset.reportDetailTrigger
    void navigate(`/app/reports/${encodeURIComponent(id)}`, { state: { detailBackgroundKey: backgroundKey ?? location.key }, preventScrollReset: true })
  }

  return <ReportDetailContext value={{
    reportId, open: Boolean(reportId), openReport,
    closeReport: () => { if (backgroundKey) void navigate(-1); else void navigate('/app/reports', { replace: true, preventScrollReset: true }) },
    returnFocus: () => {
      if (triggerRef.current?.isConnected) return triggerRef.current
      const replacement = triggerKey.current && Array.from(document.querySelectorAll<HTMLElement>('[data-report-detail-trigger]'))
        .find((element) => element.dataset.reportDetailTrigger === triggerKey.current)
      return replacement || (fallbackRef.current?.isConnected ? fallbackRef.current : null)
        || document.querySelector<HTMLElement>('[aria-label="Reports"][tabindex="-1"]') || document.getElementById('main-content')
    },
  }}>{children}</ReportDetailContext>
}

export function useReportDetail() {
  const context = useContext(ReportDetailContext)
  if (!context) throw new Error('Report details need a ReportDetailProvider.')
  return context
}

/** Open the report over the current page while keeping a shareable address. */
export function useReportDetailLink() {
  const { openReport } = useReportDetail()
  return (id: string, triggerKey: string) => ({
    to: `/app/reports/${encodeURIComponent(id)}`,
    'data-report-detail-trigger': triggerKey,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.currentTarget.target) return
      event.preventDefault()
      openReport(id, event.currentTarget)
    },
  })
}
