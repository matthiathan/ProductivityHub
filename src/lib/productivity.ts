import { supabase } from './supabase'

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'archived'

export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  estimate_minutes: number | null
  actual_minutes: number
  notes: string | null
  is_recurring: boolean
  recurrence_rule: Record<string, unknown> | null
  recurrence_timezone: string | null
  recurring_template_id: string | null
  occurrence_key: string | null
  started_at: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  projects?: Pick<Project, 'id' | 'name'> | null
}

export type CreateTaskInput = {
  user_id: string
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  project_id?: string | null
  due_at?: string | null
  estimate_minutes?: number | null
  notes?: string | null
  is_recurring?: boolean
  recurrence_rule?: Record<string, unknown> | null
  recurrence_timezone?: string | null
}

export type UpdateTaskInput = {
  title?: string
  description?: string | null
  priority?: TaskPriority
  project_id?: string | null
  due_at?: string | null
  estimate_minutes?: number | null
  notes?: string | null
}

export type UpdateProjectInput = {
  name?: string
  description?: string | null
  start_date?: string | null
  target_date?: string | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function listProjects() {
  const client = requireClient()
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function createProject(input: {
  user_id: string
  name: string
  description?: string | null
  status?: ProjectStatus
  start_date?: string | null
  target_date?: string | null
}) {
  const client = requireClient()
  const { data, error } = await client.from('projects').insert(input).select('*').single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const client = requireClient()
  const { data, error } = await client.from('projects').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data as Project
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const client = requireClient()
  const changes: Record<string, unknown> = { status }
  if (status === 'completed') changes.completed_at = new Date().toISOString()
  if (status === 'archived') changes.archived_at = new Date().toISOString()
  if (status !== 'completed') changes.completed_at = null
  if (status !== 'archived') changes.archived_at = null
  const { data, error } = await client.from('projects').update(changes).eq('id', id).select('*').single()
  if (error) throw error
  return data as Project
}

export async function listTasks() {
  const client = requireClient()
  const { data, error } = await client
    .from('tasks')
    .select('*, projects(id,name)')
    .eq('is_recurring', false)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function createTask(input: CreateTaskInput) {
  const client = requireClient()
  const { data, error } = await client.from('tasks').insert(input).select('*, projects(id,name)').single()
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const client = requireClient()
  const { data, error } = await client.from('tasks').update(input).eq('id', id).select('*, projects(id,name)').single()
  if (error) throw error
  return data as Task
}

export async function archiveTask(id: string) {
  const client = requireClient()
  const { data, error } = await client.from('tasks').update({ archived_at: new Date().toISOString() }).eq('id', id).select('*, projects(id,name)').single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const client = requireClient()
  const { error } = await client.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function createTaskReminder(userId: string, taskId: string, remindAt: string, message?: string | null) {
  const client = requireClient()
  const { data, error } = await client.from('reminders').insert({ user_id: userId, task_id: taskId, remind_at: remindAt, message: message || null }).select('*').single()
  if (error) throw error
  return data
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const client = requireClient()
  const changes: Record<string, unknown> = { status }
  if (status === 'in_progress') changes.started_at = new Date().toISOString()
  if (status === 'done') changes.completed_at = new Date().toISOString()
  if (status !== 'done') changes.completed_at = null
  const { data, error } = await client.from('tasks').update(changes).eq('id', id).select('*, projects(id,name)').single()
  if (error) throw error
  return data as Task
}

export async function generateTaskOccurrences(templateId: string, until?: string) {
  const client = requireClient()
  const { data, error } = await client.rpc('generate_task_occurrences', {
    p_template_id: templateId,
    ...(until ? { p_until: until } : {}),
  })
  if (error) throw error
  return Number(data ?? 0)
}

export type Subtask = {
  id: string
  user_id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  completed_at: string | null
}

export type Tag = { id: string; user_id: string; name: string; color: string | null }

export async function listSubtasks(taskId: string) {
  const client = requireClient()
  const { data, error } = await client.from('subtasks').select('*').eq('task_id', taskId).order('position').order('created_at')
  if (error) throw error
  return (data ?? []) as Subtask[]
}

export async function createSubtask(userId: string, taskId: string, title: string) {
  const client = requireClient()
  const { data, error } = await client.from('subtasks').insert({ user_id: userId, task_id: taskId, title }).select('*').single()
  if (error) throw error
  return data as Subtask
}

export async function setSubtaskCompleted(id: string, completed: boolean) {
  const client = requireClient()
  const { data, error } = await client.from('subtasks').update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id).select('*').single()
  if (error) throw error
  return data as Subtask
}

export async function listTaskTags(taskId: string) {
  const client = requireClient()
  const { data, error } = await client.from('task_tags').select('tags(id,user_id,name,color)').eq('task_id', taskId)
  if (error) throw error
  return (data ?? []).map((row: any) => row.tags).filter(Boolean) as Tag[]
}

export async function attachTag(userId: string, taskId: string, rawName: string) {
  const client = requireClient()
  const name = rawName.trim()
  let { data: tag, error } = await client.from('tags').select('*').eq('user_id', userId).eq('name', name).maybeSingle()
  if (error) throw error
  if (!tag) {
    const created = await client.from('tags').insert({ user_id: userId, name }).select('*').single()
    if (created.error) throw created.error
    tag = created.data
  }
  const existing = await client.from('task_tags').select('tag_id').eq('task_id', taskId).eq('tag_id', tag.id).maybeSingle()
  if (existing.error) throw existing.error
  if (!existing.data) {
    const linked = await client.from('task_tags').insert({ user_id: userId, task_id: taskId, tag_id: tag.id })
    if (linked.error) throw linked.error
  }
  return tag as Tag
}

export async function detachTag(taskId: string, tagId: string) {
  const client = requireClient()
  const { error } = await client.from('task_tags').delete().eq('task_id', taskId).eq('tag_id', tagId)
  if (error) throw error
}
