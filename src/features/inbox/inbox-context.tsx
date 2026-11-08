import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { InboxData, InboxReport, ReportAttachment } from './types'

type InboxStore = { data: InboxData; reports: InboxReport[]; setReports: Dispatch<SetStateAction<InboxReport[]>>; createAttachment: (file: File) => ReportAttachment; discardAttachment: (attachment: ReportAttachment) => void }
const InboxContext = createContext<InboxStore | null>(null)

export function InboxProvider({ data, children }: { data: InboxData; children: ReactNode }) {
  const [reports, setReports] = useState(() => structuredClone(data.reports))
  const objectUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = objectUrls.current
    return () => { for (const url of urls) URL.revokeObjectURL(url) }
  }, [])
  function createAttachment(file: File): ReportAttachment {
    const url = URL.createObjectURL(file)
    objectUrls.current.add(url)
    return { id: crypto.randomUUID(), name: file.name, url, mimeType: file.type || 'application/octet-stream', size: file.size }
  }
  function discardAttachment(attachment: ReportAttachment) {
    URL.revokeObjectURL(attachment.url)
    objectUrls.current.delete(attachment.url)
  }
  return <InboxContext value={{ data, reports, setReports, createAttachment, discardAttachment }}>{children}</InboxContext>
}
export function useInbox() {
  const store = useContext(InboxContext)
  if (!store) throw new Error('Inbox controls need an InboxProvider.')
  return store
}
