import { useId } from 'react'
import { Alert } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heading, Text } from '@/components/ui/typography'

export type ReportContactDraft = { phone: string; email: string; consent: boolean }
export const emptyReportContact: ReportContactDraft = { phone: '', email: '', consent: false }

export function ReportContactFields({ value, onChange, disabled, error }: {
  value: ReportContactDraft
  onChange: (value: ReportContactDraft) => void
  disabled: boolean
  error: string
}) {
  const id = useId()
  return <section aria-labelledby={`${id}-title`} className="space-y-4">
    <div className="space-y-1">
      <Heading id={`${id}-title`} level={2} size="compact">Can the care team contact you? (optional)</Heading>
      <Text id={`${id}-help`} size="small" tone="muted">A phone number is strongly recommended so the team can ask about the cats. You can use email instead, or send your report without contact details.</Text>
    </div>
    <div className="flex items-start gap-3">
      <Checkbox id={`${id}-consent`} checked={value.consent} disabled={disabled} aria-describedby={`${id}-help`} onCheckedChange={(checked) => onChange({ ...value, consent: checked === true })} />
      <Label htmlFor={`${id}-consent`}>I allow the care team to contact me about this report using the details I provide.</Label>
    </div>
    {value.consent ? <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-phone`}>Phone number (recommended)</Label>
        <Input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} value={value.phone} readOnly={disabled} aria-describedby={`${id}-privacy`} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-email`}>Email address (optional if you give a phone number)</Label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} value={value.email} readOnly={disabled} aria-describedby={`${id}-privacy`} onChange={(event) => onChange({ ...value, email: event.target.value })} />
      </div>
      <Text id={`${id}-privacy`} size="caption" tone="muted">These details are shared with the care team. Turn off permission above to send without contact details.</Text>
    </div> : null}
    {error ? <Alert>{error}</Alert> : null}
  </section>
}
