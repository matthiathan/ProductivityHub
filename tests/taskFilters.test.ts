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

test('all board hides future recurring occurrences but keeps today, overdue and completed', () => {
  const reference = new Date('2026-10-09T07:00:00Z')
  const recurring = [
    { id:'overdue', status:'todo', due_at:'2026-10-08T07:00:00Z', recurring_template_id:'template', archived_at:null },
    { id:'today', status:'todo', due_at:'2026-10-09T07:00:00Z', recurring_template_id:'template', archived_at:null },
    { id:'future', status:'todo', due_at:'2026-10-12T07:00:00Z', recurring_template_id:'template', archived_at:null },
    { id:'completed', status:'done', due_at:'2026-10-12T07:00:00Z', recurring_template_id:'template', archived_at:null },
    { id:'manual-future', status:'todo', due_at:'2026-10-12T07:00:00Z', recurring_template_id:null, archived_at:null },
  ]
  assert.deepEqual(filterTasks(recurring, 'all', reference).map(t => t.id), ['overdue','today','completed','manual-future'])
  assert.deepEqual(filterTasks(recurring, 'upcoming', reference).map(t => t.id), ['future','manual-future'])
})
