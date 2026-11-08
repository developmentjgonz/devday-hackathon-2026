import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { InboxCat, InboxColony, InboxData, InboxReport, ReportAttachment, Task } from './types'
import type { CatInput } from '../../../shared/schemas/directory'
import type { Coordinates } from '../../../shared/types/directory'
import type { DirectoryStore } from '@/features/colonies/directory-api'
import type { CreateReportInput, FinishReportInput, TaskInput } from '../../../shared/schemas/workspace'
import type { TaskStatus, WorkspaceMember, WorkspaceSnapshot } from '../../../shared/types/workspace'
import type { RecordActivity, RecordType } from '../../../shared/types/record-activity'
import type { TaskResult, WorkspaceStore } from './workspace-api'

type InboxStore = {
  data: InboxData; reports: InboxReport[]; tasks: Task[]; members: WorkspaceMember[]
  googleMapsEnabled: boolean
  refreshWorkspace: () => Promise<void>
  getRecordActivity: (type: RecordType, id: string, signal?: AbortSignal) => Promise<RecordActivity[]>; activityRevision: number
  addColony: (name: string, coordinates?: Coordinates, address?: string, googlePlaceId?: string) => Promise<InboxColony>; updateColonyLocation: (colony: InboxColony, coordinates: Coordinates | null, address: string, googlePlaceId?: string) => Promise<InboxColony>; addCat: (input: CatInput) => Promise<InboxCat>; updateCat: (cat: InboxCat, input: CatInput) => Promise<InboxCat>
  createAttachment: (file: File) => ReportAttachment; discardAttachment: (attachment: ReportAttachment) => void
  createReport: (input: CreateReportInput, attachments: ReportAttachment[]) => Promise<InboxReport>
  finishReport: (id: string, input: FinishReportInput) => Promise<InboxReport>; reopenReport: (id: string) => Promise<InboxReport>
  askQuestion: (id: string, text: string) => Promise<InboxReport>; linkDuplicate: (id: string, targetId: string) => Promise<InboxReport>
  createTask: (input: TaskInput) => Promise<Task>; editTask: (id: string, input: TaskInput) => Promise<Task>; changeTaskStatus: (id: string, status: TaskStatus) => Promise<Task>
}
const InboxContext = createContext<InboxStore | null>(null)

export function InboxProvider({ data, workspace, directoryStore, workspaceStore, googleMapsEnabled = false, children }: { data: InboxData; workspace: WorkspaceSnapshot; directoryStore: DirectoryStore; workspaceStore: WorkspaceStore; googleMapsEnabled?: boolean; children: ReactNode }) {
  const [reports, setReports] = useState(() => structuredClone(workspace.reports))
  const [tasks, setTasks] = useState(() => structuredClone(workspace.tasks))
  const [members, setMembers] = useState(() => structuredClone(workspace.members))
  const [activityRevision, setActivityRevision] = useState(0)
  const getRecordActivity = useCallback((type: RecordType, id: string, signal?: AbortSignal) => directoryStore.getActivity(type, id, signal), [directoryStore])
  const [directory, setDirectory] = useState(() => ({ colonies: structuredClone(data.colonies), cats: structuredClone(data.cats) }))
  const workspaceData = useMemo(() => ({ ...data, ...directory }), [data, directory])
  const objectUrls = useRef(new Set<string>())
  const attachmentFiles = useRef(new Map<string, File>())
  const mutationRevision = useRef(0)
  const activeMutations = useRef(0)
  const refreshRequest = useRef<Promise<void> | null>(null)
  const refreshController = useRef<AbortController | null>(null)
  const refreshNeeded = useRef(false)
  const refreshCallback = useRef<(() => Promise<void>) | null>(null)

  // Ignore a snapshot if a local write started or finished while it was in flight.
  const mutateWorkspace = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    mutationRevision.current += 1
    activeMutations.current += 1
    try { return await action() }
    finally {
      activeMutations.current -= 1
      mutationRevision.current += 1
      if (!activeMutations.current && refreshNeeded.current) void refreshCallback.current?.()
    }
  }, [])
  const refreshWorkspace = useCallback(async function refreshNow() {
    if (activeMutations.current) { refreshNeeded.current = true; return }
    if (refreshRequest.current) return refreshRequest.current
    refreshNeeded.current = false
    const revision = mutationRevision.current
    const controller = new AbortController()
    refreshController.current = controller
    const request = (async () => {
      try {
        const snapshot = await workspaceStore.getSnapshot(controller.signal)
        if (controller.signal.aborted) return
        if (revision !== mutationRevision.current || activeMutations.current) { refreshNeeded.current = true; return }
        setReports(snapshot.reports)
        setTasks(snapshot.tasks)
        setMembers(snapshot.members)
        setActivityRevision((revision) => revision + 1)
      } catch {
        if (!controller.signal.aborted && revision !== mutationRevision.current) refreshNeeded.current = true
      }
    })()
    refreshRequest.current = request
    try { await request }
    finally {
      if (refreshRequest.current === request) refreshRequest.current = null
      if (refreshController.current === controller) refreshController.current = null
      if (!controller.signal.aborted && refreshNeeded.current && !activeMutations.current) void refreshNow()
    }
  }, [workspaceStore])
  useEffect(() => {
    refreshCallback.current = refreshWorkspace
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refreshWorkspace() }
    const interval = window.setInterval(refreshWhenVisible, 60_000)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
      refreshController.current?.abort()
      refreshRequest.current = null
      refreshCallback.current = null
      refreshNeeded.current = false
    }
  }, [refreshWorkspace])
  useEffect(() => {
    const urls = objectUrls.current
    return () => { for (const url of urls) URL.revokeObjectURL(url) }
  }, [])
  function createAttachment(file: File): ReportAttachment {
    const url = URL.createObjectURL(file)
    objectUrls.current.add(url)
    const attachment = { id: crypto.randomUUID(), name: file.name, url, mimeType: file.type || 'application/octet-stream', size: file.size }
    attachmentFiles.current.set(attachment.id, file)
    return attachment
  }
  function discardAttachment(attachment: ReportAttachment) {
    URL.revokeObjectURL(attachment.url)
    objectUrls.current.delete(attachment.url)
    attachmentFiles.current.delete(attachment.id)
  }
  async function addColony(name: string, coordinates?: Coordinates, address?: string, googlePlaceId?: string): Promise<InboxColony> {
    const colony = await directoryStore.addColony(name, coordinates, address, googlePlaceId)
    setDirectory((current) => ({ ...current, colonies: [...current.colonies, colony] }))
    setActivityRevision((revision) => revision + 1)
    return colony
  }
  async function updateColonyLocation(existing: InboxColony, coordinates: Coordinates | null, address: string, googlePlaceId?: string): Promise<InboxColony> {
    const colony = await directoryStore.updateColonyLocation(existing, coordinates, address, googlePlaceId)
    setDirectory((current) => ({ ...current, colonies: current.colonies.map((item) => item.id === colony.id ? colony : item) }))
    setActivityRevision((revision) => revision + 1)
    return colony
  }
  async function addCat(input: CatInput): Promise<InboxCat> {
    const cat = await directoryStore.addCat(input)
    setDirectory((current) => ({ ...current, cats: [...current.cats, cat] }))
    setActivityRevision((revision) => revision + 1)
    return cat
  }
  async function updateCat(existing: InboxCat, input: CatInput): Promise<InboxCat> {
    const cat = await directoryStore.updateCat(existing, input)
    setDirectory((current) => ({ ...current, cats: current.cats.map((item) => item.id === cat.id ? cat : item) }))
    setActivityRevision((revision) => revision + 1)
    return cat
  }
  const applyReport = useCallback((report: InboxReport) => { setReports((items) => items.map((item) => item.id === report.id ? report : item)); setActivityRevision((revision) => revision + 1); return report }, [])
  const applyTask = useCallback(({ task, report }: TaskResult) => {
    setTasks((items) => items.some((item) => item.id === task.id) ? items.map((item) => item.id === task.id ? task : item) : [...items, task])
    setActivityRevision((revision) => revision + 1)
    if (report) applyReport(report)
    return task
  }, [applyReport])
  async function createReport(input: CreateReportInput, attachments: ReportAttachment[]) {
    return mutateWorkspace(async () => {
      const files = attachments.map((attachment) => {
        const file = attachmentFiles.current.get(attachment.id)
        if (!file) throw new Error('An attachment is unavailable. Remove it and try again.')
        return { attachment, file }
      })
      const report = await workspaceStore.createReport(input, files)
      setReports((items) => [report, ...items])
      setActivityRevision((revision) => revision + 1)
      for (const attachment of attachments) {
        attachmentFiles.current.delete(attachment.id)
        if (!report.attachments.some((item) => item.url === attachment.url)) discardAttachment(attachment)
      }
      return report
    })
  }
  const finishReport = useCallback((id: string, input: FinishReportInput) => mutateWorkspace(async () => applyReport(await workspaceStore.finishReport(id, input))), [workspaceStore, applyReport, mutateWorkspace])
  const reopenReport = useCallback((id: string) => mutateWorkspace(async () => applyReport(await workspaceStore.reopenReport(id))), [workspaceStore, applyReport, mutateWorkspace])
  const askQuestion = useCallback((id: string, text: string) => mutateWorkspace(async () => applyReport(await workspaceStore.askQuestion(id, text))), [workspaceStore, applyReport, mutateWorkspace])
  const linkDuplicate = useCallback((id: string, targetId: string) => mutateWorkspace(async () => applyReport(await workspaceStore.linkDuplicate(id, targetId))), [workspaceStore, applyReport, mutateWorkspace])
  const createTask = useCallback((input: TaskInput) => mutateWorkspace(async () => applyTask(await workspaceStore.createTask(input))), [workspaceStore, applyTask, mutateWorkspace])
  const editTask = useCallback((id: string, input: TaskInput) => mutateWorkspace(async () => applyTask(await workspaceStore.editTask(id, input))), [workspaceStore, applyTask, mutateWorkspace])
  const changeTaskStatus = useCallback((id: string, status: TaskStatus) => mutateWorkspace(async () => applyTask(await workspaceStore.changeTaskStatus(id, status))), [workspaceStore, applyTask, mutateWorkspace])
  return <InboxContext value={{ data: workspaceData, reports, tasks, members, googleMapsEnabled, getRecordActivity, activityRevision, refreshWorkspace, addColony, updateColonyLocation, addCat, updateCat, createAttachment, discardAttachment, createReport, finishReport, reopenReport, askQuestion, linkDuplicate, createTask, editTask, changeTaskStatus }}>{children}</InboxContext>
}
export function useInbox() {
  const store = useContext(InboxContext)
  if (!store) throw new Error('Inbox controls need an InboxProvider.')
  return store
}
