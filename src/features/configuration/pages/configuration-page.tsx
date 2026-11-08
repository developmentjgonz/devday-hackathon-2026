import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Link, NavLink, useParams, useRouteLoaderData } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Disclosure } from '@/components/ui/disclosure'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Switch } from '@/components/ui/switch'
import { TextLink } from '@/components/ui/text-link'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import type { Configuration } from '../../../../shared/types/configuration'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { databaseConfiguration, type ConfigurationStore } from '../configuration-api'
import { DemoAccess } from '../components/demo-access'
import { ReportQrCode } from '../components/report-qr-code'
import { useInbox } from '@/features/inbox/inbox-context'
import { defaultReportChatPrompt, reportChatRequirements } from '../../../../shared/report-chat-instructions'
import type { AutopilotSettings } from '../../../../shared/types/automation'

const sections = [
  { to: '/app/configuration', label: 'Communication setup', end: true },
  { to: '/app/configuration/ai', label: 'AI analysis', end: false },
  { to: '/app/configuration/access', label: 'Sign-in access', end: false },
]

export function ConfigurationPage({ store = databaseConfiguration }: { store?: ConfigurationStore }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { section } = useParams()
  return <>
    <title>Configuration · Mews</title>
    {user.role === 'administrator' ? <ConfigurationScreen store={store} section={section} />
      : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator if you need help with your account." /></Card>}
  </>
}

function ConfigurationScreen({ store, section }: { store: ConfigurationStore; section?: string }) {
  const { refreshWorkspace } = useInbox()
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [changedSections, setChangedSections] = useState<string[]>([])
  const onDirtyChange = useCallback((section: string, changed: boolean) => {
    setChangedSections((current) => changed
      ? current.includes(section) ? current : [...current, section]
      : current.includes(section) ? current.filter((item) => item !== section) : current)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoadError('')
    store.read(controller.signal).then((result) => {
      if (!controller.signal.aborted) setConfiguration(result)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Configuration is unavailable. Try again.')
    })
    return () => controller.abort()
  }, [store, reload])

  const active = section ?? 'channels'
  const knownSection = !section || section === 'ai' || section === 'access'
  return <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
    <nav aria-label="Configuration sections" className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain lg:grid lg:content-start">
      {sections.map((item) => <TextLink key={item.to} variant="navigation" render={<NavLink to={item.to} end={item.end} />}>{item.label}</TextLink>)}
    </nav>
    <div className="min-w-0 max-w-3xl">
      {!knownSection ? <Card><EmptyState icon={<ShieldCheck />} title="Page not found" action={<Button render={<Link to="/app/configuration" />}>Open configuration</Button>} /></Card>
        : loadError ? <Card><EmptyState icon={<ShieldCheck />} tone="danger" title="Configuration unavailable" description={loadError} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Try again</Button>} /></Card>
          : !configuration ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading configuration" /></div>
            : <>
              <div hidden={active !== 'channels'}><ChannelsForm initial={configuration} store={store} onDirtyChange={onDirtyChange} /></div>
              <div hidden={active !== 'ai'}><AiForm initial={configuration} store={store} onSaved={refreshWorkspace} onDirtyChange={onDirtyChange} /></div>
              <div hidden={active !== 'access'}><DemoAccess initial={configuration.demoSignInEnabled} store={store} /></div>
            </>}
    </div>
    {changedSections.length ? <DiscardOnNavigation preservePath="/app/configuration" warnBeforeUnload /> : null}
  </div>
}

type DirtyChange = (section: string, changed: boolean) => void

function ChannelsForm({ initial, store, onDirtyChange }: { initial: Configuration; store: ConfigurationStore; onDirtyChange: DirtyChange }) {
  const [saved, setSaved] = useState(initial)
  const [phone, setPhone] = useState(initial.inboundPhone)
  const [email, setEmail] = useState(initial.inboundEmail)
  const [phoneEnabled, setPhoneEnabled] = useState(initial.phoneEnabled)
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled)
  const [reportChatEnabled, setReportChatEnabled] = useState(initial.reportChatEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = phone !== saved.inboundPhone || email !== saved.inboundEmail || phoneEnabled !== saved.phoneEnabled || emailEnabled !== saved.emailEnabled || reportChatEnabled !== saved.reportChatEnabled
  useEffect(() => { onDirtyChange('channels', changed && !saving) }, [changed, saving, onDirtyChange])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await store.saveChannels({ inboundPhone: phone, inboundEmail: email, phoneEnabled, emailEnabled, reportChatEnabled })
      setSaved(result)
      setPhone(result.inboundPhone)
      setEmail(result.inboundEmail)
      setPhoneEnabled(result.phoneEnabled)
      setEmailEnabled(result.emailEnabled)
      setReportChatEnabled(result.reportChatEnabled)
      toast.success('Communication settings saved')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save communication settings. Try again.')
    } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="space-y-2"><Heading level={2} size="card">Communication setup</Heading><Text size="small" tone="muted">Choose how people can report cats to your team.</Text></div>
    <form onSubmit={submit} className="space-y-6">
      <ReportQrCode chatEnabled={reportChatEnabled} chatSaved={saved.reportChatEnabled} onChatEnabledChange={setReportChatEnabled} disabled={saving} />
      <Card><CardContent className="space-y-5">
        <div className="space-y-1"><Heading level={3} size="compact">Phone</Heading><Text size="small" tone="muted">People contact this number directly. Calls and texts do not appear in Mews.</Text></div>
        <div className="flex items-center gap-3"><Switch id="configuration-phone-enabled" checked={phoneEnabled} onCheckedChange={setPhoneEnabled} disabled={saving} /><Label htmlFor="configuration-phone-enabled">Show phone number on the public report form</Label></div>
        <div className="grid gap-2">
          <Label htmlFor="configuration-phone">Phone number</Label>
          <Input id="configuration-phone" type="tel" autoComplete="tel" maxLength={40} required={phoneEnabled} disabled={saving} value={phone} onChange={(event) => setPhone(event.target.value)} aria-describedby="configuration-phone-help" />
          <Text id="configuration-phone-help" size="caption" tone="muted">Only shown when phone is enabled.</Text>
        </div>
      </CardContent></Card>
      <Card><CardContent className="space-y-5">
        <div className="space-y-1"><Heading level={3} size="compact">Email</Heading><Text size="small" tone="muted">People email this address directly. Emails do not appear in Mews.</Text></div>
        <div className="flex items-center gap-3"><Switch id="configuration-email-enabled" checked={emailEnabled} onCheckedChange={setEmailEnabled} disabled={saving} /><Label htmlFor="configuration-email-enabled">Show email address on the public report form</Label></div>
        <div className="grid gap-2">
          <Label htmlFor="configuration-email">Email address</Label>
          <Input id="configuration-email" type="email" autoComplete="off" maxLength={254} required={emailEnabled} disabled={saving} value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="configuration-email-help" />
          <Text id="configuration-email-help" size="caption" tone="muted">Only shown when email is enabled.</Text>
        </div>
      </CardContent></Card>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" loading={saving} disabled={!changed}>Save changes</Button>
    </form>
  </div>
}

function AiForm({ initial, store, onSaved, onDirtyChange }: { initial: Configuration; store: ConfigurationStore; onSaved: () => Promise<void>; onDirtyChange: DirtyChange }) {
  const [saved, setSaved] = useState(initial)
  const [model, setModel] = useState(initial.openaiModel)
  const [prompt, setPrompt] = useState(initial.reportChatPrompt)
  const [apiKey, setApiKey] = useState('')
  const [autopilot, setAutopilot] = useState(initial.autopilot)
  const [action, setAction] = useState<'save' | 'remove' | null>(null)
  const [error, setError] = useState('')
  const changed = model !== saved.openaiModel || prompt !== saved.reportChatPrompt || Boolean(apiKey.trim()) || JSON.stringify(autopilot) !== JSON.stringify(saved.autopilot)
  useEffect(() => { onDirtyChange('ai', changed && !action) }, [changed, action, onDirtyChange])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || action) return
    setAction('save')
    setError('')
    try {
      const result = await store.saveAi({ openaiModel: model, reportChatPrompt: prompt, autopilot, ...(apiKey.trim() ? { apiKey } : {}) })
      setSaved(result)
      setModel(result.openaiModel)
      setPrompt(result.reportChatPrompt)
      setApiKey('')
      setAutopilot(result.autopilot)
      void onSaved()
      toast.success('AI settings saved')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save AI settings. Try again.')
    } finally { setAction(null) }
  }

  async function removeKey() {
    if (action) return
    setAction('remove')
    setError('')
    try {
      const result = await store.removeAiKey()
      setSaved(result)
      setApiKey('')
      setAutopilot(result.autopilot)
      void onSaved()
      toast.success('API key removed')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the API key. Try again.')
    } finally { setAction(null) }
  }

  const keyHelp = saved.openaiKeyStatus === 'saved' ? 'A key is saved. Enter a new key to replace it.'
    : saved.openaiKeyStatus === 'unavailable' ? 'The saved key cannot be accessed. You can replace or remove it.'
      : 'No API key is saved.'
  return <div className="space-y-6">
    <div className="space-y-2"><Heading level={2} size="card">AI analysis</Heading><Text size="small" tone="muted">When a key is saved, opening a report sends report details, supported attachments, and related reports to OpenAI for suggestions.</Text></div>
    <Card><CardContent><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="configuration-model">OpenAI model</Label>
        <Input id="configuration-model" autoComplete="off" maxLength={200} disabled={Boolean(action)} value={model} onChange={(event) => setModel(event.target.value)} aria-describedby="configuration-model-help" />
        <Text id="configuration-model-help" size="caption" tone="muted">Leave blank to use gpt-4.1-mini.</Text>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="configuration-key">OpenAI API key</Label>
        <Input id="configuration-key" type="password" autoComplete="off" maxLength={512} disabled={Boolean(action) || !saved.secureKeyStorageAvailable} value={apiKey} onChange={(event) => setApiKey(event.target.value)} aria-describedby="configuration-key-help" />
        <Text id="configuration-key-help" size="caption" tone="muted">{keyHelp}</Text>
        <div><TextLink size="sm" render={<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" />}>Create an OpenAI API key</TextLink></div>
        {!saved.secureKeyStorageAvailable ? <Text size="small" tone="danger">Secure key storage is unavailable. Ask the site operator for help.</Text> : null}
        {saved.openaiKeyStatus !== 'not-set' ? <div><Button type="button" size="sm" variant="outline" loading={action === 'remove'} disabled={Boolean(action)} onClick={() => void removeKey()}>Remove key</Button></div> : null}
      </div>
      <div className="space-y-5">
        <div className="space-y-1"><Heading level={3} size="compact">Autopilot</Heading><Text size="small" tone="muted">Let Mews manage reports, tasks, cats, and colonies. It checks for work every five minutes.</Text></div>
        <div className="flex items-center gap-3"><Switch id="configuration-autopilot" checked={autopilot.enabled} onCheckedChange={(enabled) => setAutopilot((value) => ({ ...value, enabled }))} disabled={Boolean(action) || (saved.openaiKeyStatus !== 'saved' && !apiKey.trim() && !autopilot.enabled)} /><Label htmlFor="configuration-autopilot">Enable autopilot</Label></div>
        {saved.openaiKeyStatus !== 'saved' && !apiKey.trim() ? <Text size="small" tone="muted">Add an OpenAI API key to enable autopilot. Removing the key pauses autopilot.</Text> : null}
        {autopilot.enabled ? <>
          <div className="space-y-5">
            {([
              ['resolveReports', 'Review reports', 'Review new reports, link confirmed duplicates, and finish reviews when the evidence is complete.'],
              ['assignTasks', 'Assign tasks', 'Create tasks from reports and assign them to available team members with the fewest open tasks. Reassign work when a member becomes unavailable.'],
              ['updateRecords', 'Update cats and colonies', 'Add records supported by reports, save cat observations, and fill missing colony locations.'],
              ['mergeColonies', 'Merge duplicate colonies', 'Combine colonies when their names and locations match. Keep their cats, reports, tasks, care rules, and history.'],
              ['requireHumanReview', 'Require human review', 'Send proposed changes, including duplicate links and colony merges, to Automation for approval before they are applied.'],
            ] satisfies [keyof AutopilotSettings, string, string][]).map(([key, label, description]) => <div key={key} className="space-y-1">
              <div className="flex items-center gap-3"><Switch id={`autopilot-${key}`} checked={autopilot[key]} disabled={Boolean(action)} onCheckedChange={(checked) => setAutopilot((value) => ({ ...value, [key]: checked }))} aria-describedby={`autopilot-${key}-help`} /><Label htmlFor={`autopilot-${key}`}>{label}</Label></div>
              <Text id={`autopilot-${key}-help`} size="small" tone="muted">{description}</Text>
            </div>)}
          </div>
          <Text size="small" tone="muted">Automation records each change and any work that needs attention. Reports with missing evidence stay open.</Text>
          {saved.autopilot.enabled ? <TextLink render={<Link to="/app/automation" />}>Open Automation</TextLink> : <Text size="small" tone="muted">Save changes to enable Automation.</Text>}
        </> : null}
      </div>
      <div className="grid gap-3">
        <div className="space-y-1"><Heading level={3} size="compact">Report chat</Heading><Text size="small" tone="muted">Set how Mews speaks with people and helps them prepare a report.</Text></div>
        <Label htmlFor="configuration-chat-prompt">Report chat system prompt</Label>
        <Textarea id="configuration-chat-prompt" rows={12} required maxLength={6000} disabled={Boolean(action)} value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-describedby="configuration-chat-prompt-help" />
        <Text id="configuration-chat-prompt-help" size="caption" tone="muted">Changes apply to the next chat reply after you save. Report confirmation, file limits, and access rules stay under app control.</Text>
        <div><Button type="button" variant="outline" size="sm" disabled={Boolean(action) || prompt === defaultReportChatPrompt} onClick={() => setPrompt(defaultReportChatPrompt)}>Restore default prompt</Button></div>
        <Disclosure title="Required report instructions"><Text size="small" tone="muted" className="whitespace-pre-wrap">{reportChatRequirements}</Text></Disclosure>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" loading={action === 'save'} disabled={!changed || Boolean(action)}>Save changes</Button>
    </form></CardContent></Card>
  </div>
}
