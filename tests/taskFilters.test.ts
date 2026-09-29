import test from 'node:test'
import assert from 'node:assert/strict'
import { filterTasks } from '../src/lib/taskFilters.ts'

const now = new Date('2026-09-29T08:00:00+02:00')
const tasks = [
  { id:'1', status:'todo', due_at:'2026-09-29T12:00:00+02:00', archived_at:null },
  { id:'2', status:'in_progress', due_at:'2026-09-30T12:00:00+02:00', archived_at:null },
  { id:'3', status:'review', due_at:'2026-09-28T12:00:00+02:00', archived_at:null },
  { id:'4', status:'done', due_at:'2026-09-27T12:00:00+02:00', archived_at:null },
  { id:'5', status:'todo', due_at:null, archived_at:'2026-09-29T06:00:00Z' },
] as const

test('filters task views using due dates and completion state', () => {
  assert.deepEqual(filterTasks(tasks as any, 'today', now).map(t=>t.id), ['1'])
  assert.deepEqual(filterTasks(tasks as any, 'upcoming', now).map(t=>t.id), ['2'])
  assert.deepEqual(filterTasks(tasks as any, 'overdue', now).map(t=>t.id), ['3'])
  assert.deepEqual(filterTasks(tasks as any, 'completed', now).map(t=>t.id), ['4'])
})

test('all view excludes archived tasks', () => {
  assert.deepEqual(filterTasks(tasks as any, 'all', now).map(t=>t.id), ['1','2','3','4'])
})
