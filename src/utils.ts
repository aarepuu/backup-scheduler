const cron = require('node-cron')
import { exec } from 'child_process'
const util = require('util')
const execute = util.promisify(require('child_process').exec)

/**
 * Utility function for checking required environment variables
 * - Checks is all required values in environment variable with the given `name` are set
 * - Logs error if no such variable or if variable undefined and exits the process (code 1)
 * @param required {Array<string>} - array of names of variables to fetch from this process's environment
 */
export function check(required: Array<string>): void {
  let errors = new Array<string>()
  required.forEach(name => {
    const value = process.env[name]
    if (!value) {
      errors.push(`[error] missing process.env['${name}'].`)
    }
  })
  // Exit if there were any errors
  if (errors.length > 0) {
    // Log each error
    errors.forEach(error => console.log(error))
    process.exit(1)
  }
}

/**
 * Utility function for validating cron schedule
 * - Checks if sting conforms to cron schedule of exists (code 1)
 * @param schedule {string} - standard cron schedule string
 * @param type {string} - schedule type [diff or full]
 */
export function validateSchedule(schedule: string, type: string): void {
  if (!cron.validate(schedule)) {
    console.log(`[error] ${type} is invalid`)
    process.exit(1)
  }
}

// /**
//  * Executes a shell command and returns it as a Promise
//  * @param cmd {string} - command to execute
//  * @return Promise {Promise<string>} - returns promise stdout or stderr
//  */
// export async function execShellCommand(cmd: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     exec(cmd, (error, stdout, stderr) => {
//       if (error) {
//         throw error
//       }
//       resolve(stdout ? stdout : stderr)
//     })
//   })
// }

/**
 * Executes a shell command and returns it as a Promise using promisfy
 * @param cmd {string} - command to execute
 * @return Promise {Promise<string>} - returns promise stdout
 * @throws new Error wit `stderr` in message
 */
export async function execShellCommand(cmd: string): Promise<string> {
  const { stdout, stderr } = await execute(cmd)

  if (stderr) {
    throw new Error(stderr)
  }
  return stdout
}
