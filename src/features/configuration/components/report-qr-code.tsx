import { useRef } from 'react'
import { ArrowUpRight, Download } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Heading, Text } from '@/components/ui/typography'

export function ReportQrCode({ chatEnabled, chatSaved, onChatEnabledChange, disabled }: { chatEnabled: boolean; chatSaved: boolean; onChatEnabledChange: (enabled: boolean) => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reportUrl = new URL('/report/chat', window.location.origin).toString()
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

  function download() {
    if (!canvas.current) return
    const link = document.createElement('a')
    link.href = canvas.current.toDataURL('image/png')
    link.download = 'mews-report-qr.png'
    link.click()
  }

  return <Card><CardContent>
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <QRCodeCanvas ref={canvas} value={reportUrl} size={512} level="M" marginSize={4} role="img" aria-label="QR code for the public report chat" className="shrink-0" style={{ width: '11rem', height: 'auto', maxWidth: '100%' }} />
      <div className="min-w-0 space-y-3">
        <Heading level={3} size="compact">Online reports</Heading>
        <Text size="small" tone="muted">Share the QR code for the chat or use the report form link. Reports go to the team inbox.</Text>
        <div className="flex items-center gap-3"><Switch id="configuration-report-chat" checked={chatEnabled} onCheckedChange={onChatEnabledChange} disabled={disabled} /><Label htmlFor="configuration-report-chat">Enable AI report chat</Label></div>
        <Text size="caption" tone="muted">The chat uses your OpenAI key. Visitors' messages are sent to OpenAI to prepare a report. When chat is off, the QR code opens the form.</Text>
        <Text size="caption" tone="muted" className="break-all">{reportUrl}</Text>
        {local ? <Text size="caption" tone="danger">This link only works on this device. Open your public site to make a QR code for others.</Text> : null}
        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="button" variant="outline" onClick={download}><Download aria-hidden="true" />Download QR code</Button>
          {chatSaved ? <Button variant="outline" render={<a href="/report/chat" />}>Open chat <ArrowUpRight aria-hidden="true" /></Button> : null}
          <Button variant="outline" render={<a href="/report" />}>Open report form <ArrowUpRight aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  </CardContent></Card>
}
