import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { InboxCat, InboxColony, InboxData, InboxReport, ReportAttachment, Task } from './types'
import type { CatInput } from '../../../shared/schemas/directory'
import type { Coordinates } from '../../../shared/types/directory'
import type { DirectoryStore } from '@/features/colonies/directory-api'
import type { CreateReportInput, FinishReportInput, TaskInput } from '../../../shared/schemas/workspace'
import type { TaskStatus, WorkspaceMember, WorkspaceSnapshot } from '../../../shared/types/workspace'
import type { TaskResult, WorkspaceStore } from './workspace-api'

type InboxStore = {
  data: InboxData; reports: InboxReport[]; tasks: Task[]; members: WorkspaceMember[]
  addColony: (name: string, coordinates?: Coordinates) => Promise<InboxColony>; updateColonyLocation: (colony: InboxColony, coordinates: Coordinates | null) => Promise<InboxColony>; addCat: (input: CatInput) => Promise<InboxCat>; updateCat: (cat: InboxCat, input: CatInput) => Promise<InboxCat>
  createAttachment: (file: File) => ReportAttachment; discardAttachment: (attachment: ReportAttachment) => void
  createReport: (input: CreateReportInput, attachments: ReportAttachment[]) => Promise<InboxReport>
  finishReport: (id: string, input: FinishReportInput) => Promise<InboxReport>; reopenReport: (id: string) => Promise<InboxReport>
  askQuestion: (id: string, text: string) => Promise<InboxReport>; linkDuplicate: (id: string, targetId: string) => Promise<InboxReport>
  markReports: (ids: string[], unread: boolean) => Promise<void>
  createTask: (input: TaskInput) => Promise<Task>; editTask: (id: string, input: TaskInput) => Promise<Task>; changeTaskStatus: (id: string, status: TaskStatus) => Promise<Task>
}
const InboxContext = createContext<InboxStore | null>(null)

export function InboxProvider({ data, workspace, directoryStore, workspaceStore, children }: { data: InboxData; workspace: WorkspaceSnapshot; directoryStore: DirectoryStore; workspaceStore: WorkspaceStore; children: ReactNode }) {
  const [reports, setReports] = useState(() => structuredClone(workspace.reports))
  const [tasks, setTasks] = useState(() => structuredClone(workspace.tasks))
  const [directory, setDirectory] = useState(() => ({ colonies: structuredClone(data.colonies), cats: structuredClone(data.cats) }))
  const workspaceData = useMemo(() => ({ ...data, ...directory }), [data, directory])
  const objectUrls = useRef(new Set<string>())
  const attachmentFiles = useRef(new Map<string, File>())
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
  async function addColony(name: string, coordinates?: Coordinates): Promise<InboxColony> {
    const colony = await directoryStore.addColony(name, coordinates)
    setDirectory((current) => ({ ...current, colonies: [...current.colonies, colony] }))
    return colony
  }
  async function updateColonyLocation(existing: InboxColony, coordinates: Coordinates | null): Promise<InboxColony> {
    const colony = await directoryStore.updateColonyLocation(existing, coordinates)
    setDirectory((current) => ({ ...current, colonies: current.colonies.map((item) => item.id === colony.id ? colony : item) }))
    return colony
  }
  async function addCat(input: CatInput): Promise<InboxCat> {
    const cat = await directoryStore.addCat(input)
    setDirectory((current) => ({ ...current, cats: [...current.cats, cat] }))
    return cat
  }
  async function updateCat(existing: InboxCat, input: CatInput): Promise<InboxCat> {
    const cat = await directoryStore.updateCat(existing, input)
    setDirectory((current) => ({ ...current, cats: current.cats.map((item) => item.id === cat.id ? cat : item) }))
    return cat
  }
  const applyReport = useCallback((report: InboxReport) => { setReports((items) => items.map((item) => item.id === report.id ? report : item)); return report }, [])
  const applyTask = useCallback(({ task, report }: TaskResult) => {
    setTasks((items) => items.some((item) => item.id === task.id) ? items.map((item) => item.id === task.id ? task : item) : [...items, task])
    if (report) applyReport(report)
    return task
  }, [applyReport])
  async function createReport(input: CreateReportInput, attachments: ReportAttachment[]) {
    const files = attachments.map((attachment) => {
      const file = attachmentFiles.current.get(attachment.id)
      if (!file) throw new Error('An attachment is unavailable. Remove it and try again.')
      return { attachment, file }
    })
    const report = await workspaceStore.createReport(input, files)
    setReports((items) => [report, ...items])
    for (const attachment of attachments) {
      attachmentFiles.current.delete(attachment.id)
      if (!report.attachments.some((item) => item.url === attachment.url)) discardAttachment(attachment)
    }
    return report
  }
  const finishReport = useCallback(async (id: string, input: FinishReportInput) => applyReport(await workspaceStore.finishReport(id, input)), [workspaceStore, applyReport])
  const reopenReport = useCallback(async (id: string) => applyReport(await workspaceStore.reopenReport(id)), [workspaceStore, applyReport])
  const askQuestion = useCallback(async (id: string, text: string) => applyReport(await workspaceStore.askQuestion(id, text)), [workspaceStore, applyReport])
  const linkDuplicate = useCallback(async (id: string, targetId: string) => applyReport(await workspaceStore.linkDuplicate(id, targetId)), [workspaceStore, applyReport])
  const markReports = useCallback(async (ids: string[], unread: boolean) => {
    await workspaceStore.markReports(ids, unread)
    const selected = new Set(ids)
    setReports((items) => items.map((item) => selected.has(item.id) ? { ...item, unread } : item))
  }, [workspaceStore])
  const createTask = useCallback(async (input: TaskInput) => applyTask(await workspaceStore.createTask(input)), [workspaceStore, applyTask])
  const editTask = useCallback(async (id: string, input: TaskInput) => applyTask(await workspaceStore.editTask(id, input)), [workspaceStore, applyTask])
  const changeTaskStatus = useCallback(async (id: string, status: TaskStatus) => applyTask(await workspaceStore.changeTaskStatus(id, status)), [workspaceStore, applyTask])
  return <InboxContext value={{ data: workspaceData, reports, tasks, members: workspace.members, addColony, updateColonyLocation, addCat, updateCat, createAttachment, discardAttachment, createReport, finishReport, reopenReport, askQuestion, linkDuplicate, markReports, createTask, editTask, changeTaskStatus }}>{children}</InboxContext>
}
export function useInbox() {
  const store = useContext(InboxContext)
  if (!store) throw new Error('Inbox controls need an InboxProvider.')
  return store
}
