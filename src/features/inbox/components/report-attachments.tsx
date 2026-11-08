import { AttachmentList } from '@/components/ui/attachment-list'
import type { ReportAttachment } from '../types'

export function ReportAttachments({ attachments, onRemove, onOpenPhoto }: { attachments: ReportAttachment[]; onRemove?: (attachment: ReportAttachment) => void; onOpenPhoto?: (attachment: ReportAttachment) => void }) {
  return <AttachmentList attachments={attachments} display={onRemove ? 'compact' : 'preview'} onRemove={onRemove} onOpenPhoto={onOpenPhoto} />
}
