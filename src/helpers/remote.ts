/*
 *  Utility functions for handling remote copying
 *   - Also handles the ssh key
 */

import { execShellCommand } from '../utils'
import { RemoteConfig } from '../config'

/**
 * Makes a key file from env variable and protects it
 * @throws new Error with `stderr` in message
 * @returns Promise {Promise<string>} - returns promise of stdout
 */
const protectKey = async (): Promise<string> => {
  const cmd = `printf "${process.env.REMOTE_KEY}" > /secrets/remote_key 2> /dev/null`
  if (process.env.IS_DUMMY) {
    console.log(cmd)
    return cmd
  }
  await execShellCommand(cmd)
  // protect the key
  return execShellCommand('chmod 0700 /secrets/remote_key')
}

/**
 * Creates a remote path to copy files to
 * @param config {RemoteConfig} - remote location configurations
 * @throws new Error with `stderr` in message
 * @returns Promise {Promise<string>} - returns promise of stdout
 */
const createRemotePath = async (config: RemoteConfig): Promise<string> => {
  const cmd = `ssh -i /secrets/remote_key -oStrictHostKeyChecking=no -oLogLevel=error "${config.user}"@"${config.host}" mkdir -p "${config.path}"`
  if (process.env.IS_DUMMY) {
    console.log(cmd)
    return cmd
  }
  return execShellCommand(cmd)
}

/**
 * Copies files to remote location using rsync
 * @param filepath {string} - path to file to copy
 * @param config {RemoteConfig} - remote location configurations for rsync
 * @throws new Error with `stderr` in message
 * @returns Promise {Promise<string>} - returns promise of stdout
 */
export const copyToRemote = async (
  filepath: string,
  config: RemoteConfig
): Promise<string> => {
  const cmd = `scp -i /secrets/remote_key -oStrictHostKeyChecking=no -oLogLevel=error -oUserKnownHostsFile=/dev/null "${filepath}" ${config.user}@${config.host}:"${config.path}"`
  if (process.env.IS_DUMMY) {
    console.log(cmd)
    return cmd
  }
  return execShellCommand(cmd)
}

/*
 *  Init function for remote copy
 */
export const init = async (remote: RemoteConfig): Promise<string> => {
  try {
    await protectKey()
    return createRemotePath(remote)
  } catch (error) {
    console.log(`Error initialising remote backups: ${error}`)
    process.exit(1)
  }
}
