import type { ProductivityComponents } from './productivityScore.ts'

export type RawProductivityMetrics = {
  totalTasks: number
  completedTasks: number
  weeklyFocusMinutes: number
  weeklyFocusTargetMinutes: number
  completedDueTasks: number
  completedDueTasksOnTime: number
  activeGoalPercentages: number[]
  activeDaysLast7: number
  openTasks: number
  overdueTasks: number
}

function percent(numerator: number, denominator: number, emptyValue = 0) {
  if (denominator <= 0) return emptyValue
  return Math.round(Math.min(1, Math.max(0, numerator / denominator)) * 100)
}

export function deriveProductivityComponents(metrics: RawProductivityMetrics): ProductivityComponents {
  const goalAverage = metrics.activeGoalPercentages.length
    ? Math.round(metrics.activeGoalPercentages.reduce((sum, value) => sum + value, 0) / metrics.activeGoalPercentages.length)
    : 0

  return {
    taskCompletion: percent(metrics.completedTasks, metrics.totalTasks),
    focusTime: percent(metrics.weeklyFocusMinutes, metrics.weeklyFocusTargetMinutes),
    deadlinePerformance: percent(metrics.completedDueTasksOnTime, metrics.completedDueTasks, 100),
    goalProgress: Math.min(100, Math.max(0, goalAverage)),
    consistency: percent(metrics.activeDaysLast7, 7),
    workloadControl: 100 - percent(metrics.overdueTasks, metrics.openTasks),
  }
}
