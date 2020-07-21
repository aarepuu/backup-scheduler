/**
 * _Entrypoint_ for running regular backups
 * - Will exit(1) if TYPE env var is not set
 * - Starts a cron on your TYPE and schedule(s) to run backups
 * - Starts a http server on :80 so the service can be pinged
 * // TODO: add monitoring that connects with prometheus
 */

import {
  check as enforceValuesOrExit,
  validateSchedule as validateScheduleOrExit
} from './utils'
import { RemoteConfig, Schedule } from './config'
import * as Configs from './config'
import * as Remote from './helpers/remote'
import { createServer, IncomingMessage, ServerResponse } from 'http'
const cron = require('node-cron')

// check if type is specified
enforceValuesOrExit(['TYPE'])
const { TYPE } = process.env

// TODO - better handling of errors
// Catch unhandling unexpected exceptions
process.on('uncaughtException', (error: Error) => {
  console.error(`uncaughtException ${error.message}`)
  process.exit(1)
})

// Catch unhandling rejected promises
process.on('unhandledRejection', (reason: any) => {
  console.error(`unhandledRejection ${reason}`)
  process.exit(1)
})
// TODO: better remote init
let remote: RemoteConfig = {
  host: undefined,
  user: undefined,
  path: undefined
}
// check if remote backups
if (process.env.IS_REMOTE) {
  enforceValuesOrExit([
    'REMOTE_HOST',
    'REMOTE_USER',
    'REMOTE_PATH',
    'REMOTE_KEY'
  ])
  ;(async () => {
    remote = {
      host: process.env.REMOTE_HOST,
      user: process.env.REMOTE_USER,
      path: process.env.REMOTE_PATH
    }
    await Remote.init(remote)
  })()
}

// load connector
const connector: any = require('./connectors/' + TYPE).default()

// setup tasks
const tasks: any[] = []

let schedules: Object[] = []

// switch for backup type
switch (TYPE) {
  case 'timescale':
  case 'postgres':
    console.log(`Backup ${TYPE}`)
    // get database config
    const config = Configs.getDatabaseConfig()
    // validate diff backup schedule
    validateScheduleOrExit(config.diff, 'DIFF_SCHEDULE')
    let diffSchedule: Schedule = {
      type: 'DIFF',
      schedule: config.diff
    }
    schedules.push(diffSchedule)
    const diff = cron.schedule(
      config.diff,
      async () => {
        console.log(`DIFF backup started at ${new Date().toISOString()}`)
        await connector.diff(config, remote)
        diffSchedule.last = new Date()
        console.log(
          `DIFF backup completed at ${diffSchedule.last.toISOString()}`
        )
      },
      { scheduled: false }
    )
    tasks.push(diff)
    // add optional full backup schedule
    if (config.full) {
      validateScheduleOrExit(config.full, 'FULL_SCHEDULE')
      let fullSchedule: Schedule = {
        type: 'FULL',
        schedule: config.full
      }
      schedules.push(fullSchedule)
      const full = cron.schedule(
        config.full,
        async () => {
          await connector.full(config, remote)
          fullSchedule.last = new Date()
        },
        { scheduled: false }
      )
      tasks.push(full)
    }
    // add optional schema backup schedule
    if (config.schema) {
      validateScheduleOrExit(config.schema, 'SCHEMA_SCHEDULE')
      let schemaSchedule: Schedule = {
        type: 'SCHEMA',
        schedule: config.schema
      }
      schedules.push(schemaSchedule)
      const schema = cron.schedule(
        config.schema,
        async () => {
          console.log(`SCHEMA backup started at ${new Date().toISOString()}`)
          await connector.schema(config, remote)
          schemaSchedule.last = new Date()
          console.log(
            `SCHEMA backup completed at ${schemaSchedule.last.toISOString()}`
          )
        },
        { scheduled: false }
      )
      tasks.push(schema)
    }
    break
  case 'file':
    console.log(`Backup ${TYPE}`)
    break
  default:
    console.log(`[error] ${TYPE} is not handled!`)
    process.exit(1)
}

// start all tasks
tasks.forEach(task => {
  task.start()
})

// start monitoring server
const server = createServer(
  (request: IncomingMessage, response: ServerResponse) => {
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    response.write(JSON.stringify({ status: 'OK', type: TYPE, schedules }))
    response.end()
  }
)

server.listen(80, () => {
  console.log('Monitoring server running')
})

process.on('SIGINT', () => {
  console.log('Exiting ...')
  tasks.forEach(task => {
    task.destroy()
  })
  server.close()
})
