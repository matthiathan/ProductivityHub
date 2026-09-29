import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateProductivityScore } from '../src/lib/productivityScore.ts'

test('calculates weighted productivity score from six visible components', () => {
  const result = calculateProductivityScore({
    taskCompletion: 90,
    focusTime: 80,
    deadlinePerformance: 70,
    goalProgress: 60,
    consistency: 50,
    workloadControl: 40,
  })

  assert.equal(result.score, 70)
  assert.deepEqual(result.components, {
    taskCompletion: 90,
    focusTime: 80,
    deadlinePerformance: 70,
    goalProgress: 60,
    consistency: 50,
    workloadControl: 40,
  })
})

test('clamps component values and normalizes custom weights', () => {
  const result = calculateProductivityScore(
    {
      taskCompletion: 120,
      focusTime: -10,
      deadlinePerformance: 50,
      goalProgress: 50,
      consistency: 50,
      workloadControl: 50,
    },
    {
      taskCompletion: 1,
      focusTime: 1,
      deadlinePerformance: 0,
      goalProgress: 0,
      consistency: 0,
      workloadControl: 0,
    },
  )

  assert.equal(result.score, 50)
  assert.equal(result.components.taskCompletion, 100)
  assert.equal(result.components.focusTime, 0)
})
