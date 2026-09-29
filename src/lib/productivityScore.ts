export type ProductivityComponents = {
  taskCompletion: number
  focusTime: number
  deadlinePerformance: number
  goalProgress: number
  consistency: number
  workloadControl: number
}

export type ProductivityWeights = Record<keyof ProductivityComponents, number>

export const DEFAULT_PRODUCTIVITY_WEIGHTS: ProductivityWeights = {
  taskCompletion: 25,
  focusTime: 20,
  deadlinePerformance: 15,
  goalProgress: 15,
  consistency: 15,
  workloadControl: 10,
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function calculateProductivityScore(
  input: ProductivityComponents,
  weights: ProductivityWeights = DEFAULT_PRODUCTIVITY_WEIGHTS,
) {
  const components: ProductivityComponents = {
    taskCompletion: clampScore(input.taskCompletion),
    focusTime: clampScore(input.focusTime),
    deadlinePerformance: clampScore(input.deadlinePerformance),
    goalProgress: clampScore(input.goalProgress),
    consistency: clampScore(input.consistency),
    workloadControl: clampScore(input.workloadControl),
  }

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (totalWeight === 0) return { score: 0, components, weights }

  const weightedTotal = (Object.keys(components) as Array<keyof ProductivityComponents>).reduce(
    (sum, key) => sum + components[key] * Math.max(0, weights[key]),
    0,
  )

  return {
    score: Math.round(weightedTotal / totalWeight),
    components,
    weights,
  }
}
