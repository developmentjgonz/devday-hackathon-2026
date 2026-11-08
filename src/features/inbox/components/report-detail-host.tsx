import { useRef } from 'react'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '../inbox-context'
import { useReportDetail } from './report-detail-context'
import { ReportReviewDrawer } from './report-review-drawer'

export function ReportDetailHost() {
  const { data, reports } = useInbox()
  const { reportId, open, closeReport, returnFocus } = useReportDetail()
  const lastReportId = useRef<string | null>(null)
  if (reportId) lastReportId.current = reportId
  // Keep the drawer mounted while closed so unfinished reviews and suggestions survive.
  const report = reports.find((item) => item.id === (reportId ?? lastReportId.current)) ?? null
  if (!report) return null

  return <ReportReviewDrawer
    report={report}
    reports={reports}
    data={data}
    open={open}
    onClose={closeReport}
    onNotice={(message) => toast.success(message)}
    finalFocus={returnFocus}
  />
}
