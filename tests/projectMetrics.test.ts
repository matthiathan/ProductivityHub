import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateProjectMetrics } from '../src/lib/projectMetrics.ts'

test('calculates project progress from visible linked tasks', () => {
  const result = calculateProjectMetrics([
    { status:'done', actual_minutes:30, archived_at:null },
    { status:'in_progress', actual_minutes:45, archived_at:null },
    { status:'done', actual_minutes:15, archived_at:'2026-09-01T00:00:00Z' },
  ])
  assert.deepEqual(result, { totalTasks:2, completedTasks:1, openTasks:1, progressPercent:50, trackedMinutes:75 })
})

test('empty projects start at zero progress', () => {
  assert.deepEqual(calculateProjectMetrics([]), { totalTasks:0, completedTasks:0, openTasks:0, progressPercent:0, trackedMinutes:0 })
})
