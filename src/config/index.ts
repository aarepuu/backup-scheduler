import {
  check as enforceValuesOrExit,
  validateSchedule as validateScheduleOrExit
} from '../utils'

export interface DBConfig {
  host: string
  port: string
  user: string
  pass: string
  name: string
  diff: string
  cache_dir: string
  data_dir: string
  full?: string
  schema?: string
}

export interface FileConfig {
  path: string
}

export interface Schedule {
  type: string
  schedule: string
  last?: Date
}

export interface RemoteConfig {
  host: string | undefined
  user: string | undefined
  path: string | undefined
}

export function getDatabaseConfig(): DBConfig {
  // check for required values or exit
  enforceValuesOrExit([
    'DB_HOST',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'DIFF_SCHEDULE'
  ])
  // TODO: find a better way of reading all the variables
  return {
    host: String(process.env.DB_HOST),
    port: String(process.env.DB_PORT) || '5432',
    user: String(process.env.DB_USER),
    pass: String(process.env.DB_PASS),
    name: String(process.env.DB_NAME),
    diff: String(process.env.DIFF_SCHEDULE),
    cache_dir: process.env.CACHE_DIR || '/cache',
    data_dir: process.env.DATA_DIR || '/data',
    full: process.env.FULL_SCHEDULE,
    schema: process.env.SCHEMA_SCHEDULE
  }
}

export function getFileConfig(): FileConfig {
  enforceValuesOrExit(['FILE_PATH'])
  return { path: String(process.env.path) }
}
