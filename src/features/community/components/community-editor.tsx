import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import { communityPostSchema, communitySectionSchema } from '../../../../shared/schemas/community'
import type { CommunityBoard, CommunityPost, CommunitySection } from '../../../../shared/types/public'
import type { CommunityStore } from '../community-api'

export type BoardEditor = { type: 'section'; section?: CommunitySection } | { type: 'post'; sectionId: string; post?: CommunityPost }

export function CommunityEditor({ editor, board, store, onSaved, onClose }: {
  editor: BoardEditor
  board: CommunityBoard
  store: CommunityStore
  onSaved: (board: CommunityBoard, message: string) => void
  onClose: () => void
}) {
  const section = editor.type === 'section' ? editor.section : undefined
  const post = editor.type === 'post' ? editor.post : undefined
  const [title, setTitle] = useState(section?.title ?? post?.title ?? '')
  const [layout, setLayout] = useState<CommunitySection['layout']>(section?.layout ?? 'cards')
  const [sectionId, setSectionId] = useState(editor.type === 'post' ? editor.sectionId : '')
  const [description, setDescription] = useState(post?.description ?? '')
  const [area, setArea] = useState(post?.area ?? '')
  const [schedule, setSchedule] = useState(post?.schedule ?? '')
  const [date, setDate] = useState(post?.date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = editor.type === 'section'
    ? title !== (section?.title ?? '') || layout !== (section?.layout ?? 'cards')
    : title !== (post?.title ?? '') || description !== (post?.description ?? '') || area !== (post?.area ?? '') || schedule !== (post?.schedule ?? '') || date !== (post?.date ?? '') || sectionId !== editor.sectionId
  const { requestDiscard, dialogProps } = useDiscardConfirmation(changed && !saving)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError('')
    const result = editor.type === 'section'
      ? communitySectionSchema.safeParse({ title, layout })
      : communityPostSchema.safeParse({ title, sectionId, description, area, schedule, date })
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Check the form and try again.'); return }
    setSaving(true)
    try {
      const updated = editor.type === 'section'
        ? await store.saveSection(communitySectionSchema.parse(result.data), section?.id)
        : await store.savePost(communityPostSchema.parse(result.data), post?.id)
      onSaved(updated, editor.type === 'section' ? section ? 'Section updated' : 'Section added' : post ? 'Post updated' : 'Post published')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your changes. Try again.')
      setSaving(false)
    }
  }

  const actionLabel = editor.type === 'section' ? section ? 'Save changes' : 'Add section' : post ? 'Save changes' : 'Publish post'
  return <>
    <Dialog open onOpenChange={(open) => { if (!open && !saving) requestDiscard(onClose) }}>
      <DialogContent layout="scroll" closeDisabled={saving}>
        <DialogHeader>
          <DialogTitle>{editor.type === 'section' ? section ? 'Edit section' : 'Add section' : post ? 'Edit post' : 'Add post'}</DialogTitle>
          <DialogDescription>{editor.type === 'section' ? 'Group board posts by topic.' : post?.published === false ? 'This post stays retired until you restore it.' : 'Saved posts appear on the public community board.'}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form id="community-editor" onSubmit={submit} className="space-y-5">
            <fieldset disabled={saving} className="min-w-0 space-y-5">
              {editor.type === 'post' ? <div className="grid gap-2">
                <Label htmlFor="board-post-section">Section</Label>
                <SelectField id="board-post-section" value={sectionId} onChange={(event) => setSectionId(event.target.value)} required>
                  {board.sections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </SelectField>
              </div> : null}
              <div className="grid gap-2">
                <Label htmlFor="board-title">{editor.type === 'section' ? 'Section name' : 'Post title'}</Label>
                <Input id="board-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={editor.type === 'section' ? 80 : 160} />
              </div>
              {editor.type === 'section' ? <div className="grid gap-2">
                <Label htmlFor="board-section-layout">Display</Label>
                <SelectField id="board-section-layout" value={layout} onChange={(event) => setLayout(event.target.value as CommunitySection['layout'])}>
                  <option value="cards">Cards</option><option value="list">List</option>
                </SelectField>
              </div> : <>
                <div className="grid gap-2">
                  <Label htmlFor="board-description">Details</Label>
                  <Textarea id="board-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={2000} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="board-area">Area (optional)</Label>
                  <Input id="board-area" value={area} onChange={(event) => setArea(event.target.value)} maxLength={160} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="board-schedule">Schedule (optional)</Label>
                  <Input id="board-schedule" value={schedule} onChange={(event) => setSchedule(event.target.value)} maxLength={160} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="board-date">Date (optional)</Label>
                  <Input id="board-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-describedby="board-date-help" />
                  <Text size="caption" tone="muted" id="board-date-help">Shown on the post. It does not schedule publication.</Text>
                </div>
              </>}
            </fieldset>
            {error ? <Alert>{error}</Alert> : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => requestDiscard(onClose)}>Cancel</Button>
          <Button type="submit" form="community-editor" loading={saving} disabled={!changed || saving}>{actionLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DiscardChangesDialog {...dialogProps} />
  </>
}
