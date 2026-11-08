import type { Directory } from './directory.ts'

export type StatisticsSnapshot = Directory & { asOf: string }
