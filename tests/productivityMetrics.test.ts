import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveProductivityComponents } from '../src/lib/productivityMetrics.ts'

test('derives transparent component scores from raw productivity metrics', () => {
  const result = deriveProductivityComponents({
    totalTasks: 10,
    completedTasks: 8,
    weeklyFocusMinutes: 900,
    weeklyFocusTargetMinutes: 1200,
    completedDueTasks: 5,
    completedDueTasksOnTime: 4,
    activeGoalPercentages: [50, 100],
    activeDaysLast7: 6,
    openTasks: 4,
    overdueTasks: 1,
  })

  assert.deepEqual(result, {
    taskCompletion: 80,
    focusTime: 75,
    deadlinePerformance: 80,
    goalProgress: 75,
    consistency: 86,
    workloadControl: 75,
  })
})

test('uses neutral-safe defaults when there are no deadline or workload samples', () => {
  const result = deriveProductivityComponents({
    totalTasks: 0,
    completedTasks: 0,
    weeklyFocusMinutes: 0,
    weeklyFocusTargetMinutes: 1200,
    completedDueTasks: 0,
    completedDueTasksOnTime: 0,
    activeGoalPercentages: [],
    activeDaysLast7: 0,
    openTasks: 0,
    overdueTasks: 0,
  })

  assert.equal(result.taskCompletion, 0)
  assert.equal(result.deadlinePerformance, 100)
  assert.equal(result.goalProgress, 0)
  assert.equal(result.workloadControl, 100)
})
