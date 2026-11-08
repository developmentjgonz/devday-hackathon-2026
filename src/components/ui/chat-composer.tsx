import { useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Label } from './label'
import { Textarea } from './textarea'
import { Text } from './typography'

export function ChatComposer({ value, onChange, onSubmit, loading, disabled, readOnly, actions, maxLength = 500, layout = 'stacked' }: {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  loading?: boolean
  disabled?: boolean
  readOnly?: boolean
  actions?: ReactNode
  maxLength?: number
  layout?: 'stacked' | 'inline'
}) {
  const id = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!loading && !disabled && !readOnly) event.currentTarget.form?.requestSubmit()
    }
  }

  return <Card size="sm" padding="none" focusWithin="subtle" render={<form onSubmit={onSubmit} />} className={layout === 'inline' ? 'flex-row items-end' : undefined}>
    <Label htmlFor={id} className="sr-only">Your message</Label>
    <Textarea ref={input} id={id} variant="composer" rows={1} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} maxLength={maxLength} disabled={disabled} readOnly={loading || readOnly} aria-busy={loading || undefined} enterKeyHint="send" placeholder="Type your message…" />
    <CardContent className={layout === 'inline' ? 'flex shrink-0 items-center p-2.5 pl-0' : 'flex items-end justify-between gap-3 pb-3'}>
      <div className="min-w-0 flex-1">{actions ?? (layout === 'stacked' ? <Text size="caption" tone="muted" className="hidden sm:block">Enter to send · Shift + Enter for a new line</Text> : null)}</div>
      <Button type="submit" variant="chat-send" size="icon-sm" className="ml-auto" loading={loading} disabled={disabled || readOnly || !value.trim()} onPointerDown={(event) => { if (document.activeElement === input.current) event.preventDefault() }} aria-label="Send message"><ArrowUp aria-hidden="true" /></Button>
    </CardContent>
  </Card>
}
