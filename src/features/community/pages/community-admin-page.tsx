import { useEffect, useRef, useState } from 'react'
import { Link, useRouteLoaderData } from 'react-router'
import { Archive, CircleAlert, ExternalLink, Plus, RotateCcw, ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Text } from '@/components/ui/typography'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { toast } from '@/components/ui/toaster'
import type { WorkspaceData } from '../../../../shared/types/directory'
import type { CommunityBoard as Board, CommunityPost } from '../../../../shared/types/public'
import { databaseCommunity, type CommunityStore } from '../community-api'
import { CommunityBoard } from '../components/community-board'
import { CommunityEditor, type BoardEditor } from '../components/community-editor'

export function CommunityAdminPage({ store = databaseCommunity }: { store?: CommunityStore }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <>
    <title>Manage community board · Mews</title>
    {user.role === 'administrator' ? <CommunityManager store={store} /> : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Only administrators can manage the community board." /></Card>}
  </>
}

function CommunityManager({ store }: { store: CommunityStore }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<'published' | 'retired'>('published')
  const [editor, setEditor] = useState<BoardEditor | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const actionInFlight = useRef(false)
  const boardRegion = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoadError('')
    store.read(controller.signal).then((result) => { if (!controller.signal.aborted) setBoard(result) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Could not load the board. Try again.') })
    return () => controller.abort()
  }, [store, attempt])

  async function togglePublished(post: CommunityPost) {
    if (actionInFlight.current) return
    actionInFlight.current = true
    setBusyId(post.id)
    setActionError('')
    try {
      setBoard(await store.setPublished(post.id, !post.published))
      toast.success(post.published ? 'Post retired' : 'Post restored', { description: post.published ? 'It is no longer on the public board.' : 'It is back on the public board.' })
      boardRegion.current?.focus({ preventScroll: true })
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update the post. Try again.')
    } finally { actionInFlight.current = false; setBusyId(null) }
  }

  const visibleBoard = board ? { ...board, posts: board.posts.filter((post) => post.published === (view === 'published')) } : null
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <Text size="small" tone="muted" className="max-w-lg">Add sections and posts for your community. Retire a post when it is no longer needed.</Text>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" render={<Link to="/community" target="_blank" rel="noopener noreferrer" />}>View public board <ExternalLink aria-hidden="true" /></Button>
        <Button size="sm" disabled={!board || Boolean(busyId)} onClick={() => setEditor({ type: 'section' })}><Plus aria-hidden="true" />Add section</Button>
      </div>
    </div>
    {loadError ? <Card><EmptyState icon={<CircleAlert />} title="Could not load the community board" description={loadError} action={<Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>} /></Card>
      : !board ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading community board" /></div>
        : <>
          <div className="flex"><ViewSwitcher label="Board posts" value={view} onValueChange={setView} options={[
            { value: 'published', label: 'Published' },
            { value: 'retired', label: 'Retired', icon: <Archive aria-hidden="true" /> },
          ]} /></div>
          {actionError ? <Alert>{actionError}</Alert> : null}
          <div ref={boardRegion} tabIndex={-1} aria-label={`${view === 'published' ? 'Published' : 'Retired'} board posts`} className="outline-none">
            {visibleBoard && view === 'retired' && !visibleBoard.posts.length ? <Card><EmptyState icon={<Archive />} title="No retired posts" description="Retired posts stay here so you can restore them later." /></Card>
              : visibleBoard ? <CommunityBoard board={visibleBoard} emptyTitle={view === 'published' ? 'No published posts in this section' : 'No retired posts in this section'}
                renderSectionActions={(section) => <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" disabled={Boolean(busyId)} aria-label={`Edit section: ${section.title}`} onClick={() => setEditor({ type: 'section', section })}>Edit section</Button>
                  <Button variant="outline" size="sm" disabled={Boolean(busyId)} aria-label={`Add post to ${section.title}`} onClick={() => setEditor({ type: 'post', sectionId: section.id })}><Plus aria-hidden="true" />Add post</Button>
                </div>}
                renderPostActions={(post) => <>
                  <Button variant="ghost" size="sm" disabled={Boolean(busyId)} aria-label={`Edit post: ${post.title}`} onClick={() => setEditor({ type: 'post', sectionId: post.sectionId, post })}>Edit</Button>
                  <Button variant="outline" size="sm" loading={busyId === post.id} disabled={Boolean(busyId)} aria-label={`${post.published ? 'Retire' : 'Restore'} post: ${post.title}`} onClick={() => void togglePublished(post)}>
                    {post.published ? <Archive aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}{post.published ? 'Retire' : 'Restore'}
                  </Button>
                </>} /> : null}
          </div>
        </>}
    {editor && board ? <CommunityEditor editor={editor} board={board} store={store} onClose={() => setEditor(null)} onSaved={(updated, message) => {
      setBoard(updated)
      setEditor(null)
      setActionError('')
      if (editor.type === 'post' && !editor.post) setView('published')
      toast.success(message)
    }} /> : null}
  </div>
}
