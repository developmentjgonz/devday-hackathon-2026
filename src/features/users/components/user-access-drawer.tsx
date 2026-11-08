import { Alert } from '@/components/ui/alert'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Heading, Text } from '@/components/ui/typography'
import { UserAvatar } from '@/components/ui/user-avatar'
import type { AccountStatus, ManagedUser, UserRole } from '../../../../shared/types/auth'
import { formatJoined, roleLabel, statusLabel } from '../user-display'

export function UserAccessDrawer({ user, currentUserId, role, status, canBeAssignedTasks, busy, error, onRoleChange, onStatusChange, onCanBeAssignedTasksChange, onClose, onSave, onRefresh, finalFocus }: {
  user: ManagedUser | null
  currentUserId: string
  role: UserRole
  status: Exclude<AccountStatus, 'pending'>
  canBeAssignedTasks: boolean
  busy: boolean
  error: string
  onRoleChange: (role: UserRole) => void
  onStatusChange: (status: Exclude<AccountStatus, 'pending'>) => void
  onCanBeAssignedTasksChange: (enabled: boolean) => void
  onClose: () => void
  onSave: () => void
  onRefresh: () => void
  finalFocus: () => false
}) {
  const pending = user?.status === 'pending'
  const ownAccount = user?.id === currentUserId
  const changed = user && (pending || role !== user.role || status !== user.status || canBeAssignedTasks !== user.canBeAssignedTasks)
  const hasChanges = Boolean(user && ((!pending && (role !== user.role || status !== user.status)) || canBeAssignedTasks !== user.canBeAssignedTasks))
  const discard = useDiscardConfirmation(hasChanges)
  function close() { discard.requestDiscard(onClose) }
  return <Drawer open={Boolean(user)} onOpenChange={(open, event) => { if (!open) { if (busy || hasChanges) event.cancel(); if (!busy) close() } }}>
    <DrawerContent closeLabel="Close account details" closeDisabled={busy} finalFocus={finalFocus}>
      <DrawerHeader>
        <DialogTitle>{pending ? 'Review access request' : 'Account details'}</DialogTitle>
      </DrawerHeader>
      {user ? <>
        <DrawerBody>
          <div className="flex min-w-0 items-start gap-4">
            <UserAvatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0 space-y-1">
              <Heading level={2} size="card" className="wrap-anywhere">{user.name}{ownAccount ? ' (you)' : ''}</Heading>
              <Text size="small" tone="muted" className="wrap-anywhere">{user.email}</Text>
              <Badge variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'outline'}>{statusLabel(user.status)}</Badge>
            </div>
          </div>
          <section className="space-y-3" aria-labelledby="account-details-heading">
            <Heading id="account-details-heading" level={3} size="compact">Details</Heading>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><Text render={<dt />} size="caption" tone="muted">Phone</Text><Text render={<dd />} size="small" className="wrap-anywhere">{user.phone || 'Not provided'}</Text></div>
              <div><Text render={<dt />} size="caption" tone="muted">Requested on</Text><Text render={<dd />} size="small">{formatJoined(user.createdAt)}</Text></div>
            </dl>
          </section>
          {pending ? <section className="space-y-2" aria-labelledby="request-access-heading">
            <Heading id="request-access-heading" level={3} size="compact">Workspace access</Heading>
            <Text size="small" tone="muted">Approving this request gives {user.name} member access to the workspace.</Text>
          </section> : ownAccount ? <section className="space-y-2" aria-labelledby="own-access-heading">
            <Heading id="own-access-heading" level={3} size="compact">Workspace access</Heading>
            <Text size="small">{roleLabel(user.role)} · {statusLabel(user.status)}</Text>
            <Text size="small" tone="muted">Another administrator must change your access.</Text>
          </section> : <section className="space-y-4" aria-labelledby="manage-access-heading">
            <Heading id="manage-access-heading" level={3} size="compact">Workspace access</Heading>
            <div className="space-y-2"><Label htmlFor="user-role">Role</Label>
              <SelectField id="user-role" value={role} disabled={busy} onChange={(event) => onRoleChange(event.target.value as UserRole)}>
                <option value="member">Member</option><option value="administrator">Administrator</option>
              </SelectField>
              <Text size="caption" tone="muted">{role === 'administrator' ? 'Administrators can manage team access.' : 'Members can work with colonies, cats, reports, and tasks.'}</Text>
            </div>
            <div className="space-y-2"><Label htmlFor="user-status">Access</Label>
              <SelectField id="user-status" value={status} disabled={busy} onChange={(event) => onStatusChange(event.target.value as Exclude<AccountStatus, 'pending'>)}>
                <option value="active">Active</option><option value="suspended">Suspended</option>
              </SelectField>
              <Text size="caption" tone="muted">{status === 'suspended' ? 'This person cannot enter the workspace while access is suspended.' : 'This person can enter the workspace.'}</Text>
            </div>
          </section>}
          <section className="space-y-3" aria-labelledby="task-assignments-heading">
            <Heading id="task-assignments-heading" level={3} size="compact">Task assignments</Heading>
            <div className="space-y-2"><Label htmlFor="user-task-assignments">Available for tasks</Label>
              <SelectField id="user-task-assignments" value={canBeAssignedTasks ? 'enabled' : 'disabled'} disabled={busy} onChange={(event) => onCanBeAssignedTasksChange(event.target.value === 'enabled')}>
                <option value="enabled">Enabled</option><option value="disabled">Disabled</option>
              </SelectField>
              <Text size="caption" tone="muted">Active accounts with this setting enabled appear in task assignment lists. Existing tasks and care schedules stay assigned.</Text>
            </div>
          </section>
          {error ? <div className="space-y-3"><Alert>{error}</Alert><Button variant="outline" size="sm" onClick={() => discard.requestDiscard(onRefresh)}>Refresh team list</Button></div> : null}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline" disabled={busy} onClick={close}>{ownAccount ? 'Close' : 'Cancel'}</Button>
          <Button loading={busy} disabled={!changed} onClick={onSave}>{pending ? 'Approve access' : 'Save changes'}</Button>
        </DrawerFooter>
      </> : null}
      <DiscardChangesDialog {...discard.dialogProps} />
      {hasChanges && !busy ? <DiscardOnNavigation onDiscard={onClose} /> : null}
    </DrawerContent>
  </Drawer>
}
