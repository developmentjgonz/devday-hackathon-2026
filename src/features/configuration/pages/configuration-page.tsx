import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useParams, useRouteLoaderData } from 'react-router'
import { QrCode, ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { TextLink } from '@/components/ui/text-link'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import type { Configuration } from '../../../../shared/types/configuration'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { databaseConfiguration, type ConfigurationStore } from '../configuration-api'

const sections = [
  { to: '/app/configuration', label: 'Phone & email', end: true },
  { to: '/app/configuration/ai', label: 'AI analysis', end: false },
  { to: '/app/configuration/reporting', label: 'Public reporting', end: false },
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
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)

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
  const knownSection = !section || section === 'ai' || section === 'reporting'
  return <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
    <nav aria-label="Configuration sections" className="grid content-start gap-1 sm:grid-cols-3 lg:grid-cols-1">
      {sections.map((item) => <TextLink key={item.to} variant="navigation" render={<NavLink to={item.to} end={item.end} />}>{item.label}</TextLink>)}
    </nav>
    <div className="min-w-0 max-w-3xl">
      {!knownSection ? <Card><EmptyState icon={<ShieldCheck />} title="Page not found" action={<Button render={<Link to="/app/configuration" />}>Open configuration</Button>} /></Card>
        : loadError ? <Card><EmptyState icon={<ShieldCheck />} tone="danger" title="Configuration unavailable" description={loadError} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Try again</Button>} /></Card>
          : !configuration ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading configuration" /></div>
            : <>
              <div hidden={active !== 'channels'}><ChannelsForm initial={configuration} store={store} /></div>
              <div hidden={active !== 'ai'}><AiForm initial={configuration} store={store} /></div>
              <div hidden={active !== 'reporting'}><Card><EmptyState icon={<QrCode />} title="Public reporting unavailable" description="There is no public report link to share." /></Card></div>
            </>}
    </div>
  </div>
}

function ChannelsForm({ initial, store }: { initial: Configuration; store: ConfigurationStore }) {
  const [saved, setSaved] = useState(initial)
  const [phone, setPhone] = useState(initial.inboundPhone)
  const [email, setEmail] = useState(initial.inboundEmail)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = phone !== saved.inboundPhone || email !== saved.inboundEmail

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await store.saveChannels({ inboundPhone: phone, inboundEmail: email })
      setSaved(result)
      setPhone(result.inboundPhone)
      setEmail(result.inboundEmail)
      toast.success('Phone and email saved')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save phone and email. Try again.')
    } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="space-y-2"><Heading level={2} size="card">Phone &amp; email</Heading><Text size="small" tone="muted">Set contact details for incoming reports.</Text></div>
    <Card><CardContent><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="configuration-phone">Phone number</Label>
        <Input id="configuration-phone" type="tel" autoComplete="tel" maxLength={40} disabled={saving} value={phone} onChange={(event) => setPhone(event.target.value)} aria-describedby="configuration-phone-help" />
        <Text id="configuration-phone-help" size="caption" tone="muted">Calls and texts are not connected.</Text>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="configuration-email">Inbound email</Label>
        <Input id="configuration-email" type="email" autoComplete="off" maxLength={254} disabled={saving} value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="configuration-email-help" />
        <Text id="configuration-email-help" size="caption" tone="muted">Email is not connected.</Text>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" loading={saving} disabled={!changed}>Save changes</Button>
    </form></CardContent></Card>
  </div>
}

function AiForm({ initial, store }: { initial: Configuration; store: ConfigurationStore }) {
  const [saved, setSaved] = useState(initial)
  const [model, setModel] = useState(initial.openaiModel)
  const [apiKey, setApiKey] = useState('')
  const [action, setAction] = useState<'save' | 'remove' | null>(null)
  const [error, setError] = useState('')
  const changed = model !== saved.openaiModel || Boolean(apiKey.trim())

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || action) return
    setAction('save')
    setError('')
    try {
      const result = await store.saveAi({ openaiModel: model, ...(apiKey.trim() ? { apiKey } : {}) })
      setSaved(result)
      setModel(result.openaiModel)
      setApiKey('')
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
      toast.success('API key removed')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the API key. Try again.')
    } finally { setAction(null) }
  }

  const keyHelp = saved.openaiKeyStatus === 'saved' ? 'A key is saved. Enter a new key to replace it.'
    : saved.openaiKeyStatus === 'unavailable' ? 'The saved key cannot be accessed. You can replace or remove it.'
      : 'No API key is saved.'
  return <div className="space-y-6">
    <div className="space-y-2"><Heading level={2} size="card">AI analysis</Heading><Text size="small" tone="muted">Configure the OpenAI model and API key for your workspace. Analysis is not connected.</Text></div>
    <Card><CardContent><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="configuration-model">OpenAI model</Label>
        <Input id="configuration-model" autoComplete="off" maxLength={200} disabled={Boolean(action)} value={model} onChange={(event) => setModel(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="configuration-key">OpenAI API key</Label>
        <Input id="configuration-key" type="password" autoComplete="off" maxLength={512} disabled={Boolean(action) || !saved.secureKeyStorageAvailable} value={apiKey} onChange={(event) => setApiKey(event.target.value)} aria-describedby="configuration-key-help" />
        <Text id="configuration-key-help" size="caption" tone="muted">{keyHelp}</Text>
        <div><TextLink size="sm" render={<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" />}>Create an OpenAI API key</TextLink></div>
        {!saved.secureKeyStorageAvailable ? <Text size="small" tone="danger">Secure key storage is unavailable. Ask the site operator for help.</Text> : null}
        {saved.openaiKeyStatus !== 'not-set' ? <div><Button type="button" size="sm" variant="outline" loading={action === 'remove'} disabled={Boolean(action)} onClick={() => void removeKey()}>Remove key</Button></div> : null}
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" loading={action === 'save'} disabled={!changed || Boolean(action)}>Save changes</Button>
    </form></CardContent></Card>
  </div>
}
