/*
 *  Helper functions for dealing with the transaction cache for diff backups
 */

import { execShellCommand } from '../utils'

/**
 * Function for fetching all table transaction files
 * @param cache_dir {string} - cache dir location
 * @returns {Promise<string[]>} - array promise of files with table transaction_ids
 */
export async function fetchTransactionFiles(
  cache_dir: string
): Promise<string[]> {
  const currentIds = await execShellCommand(`ls "${cache_dir}" 2> /dev/null`)
  return currentIds.split('\n').filter(file => file)
}

/**
 * Function for checking if the transaction_id is modified
 * @param filename {string} - filepath
 * @returns {Promise<boolean>} - returns true if transaction_id is different
 */
export async function isModified(
  filepath: string,
  transaction_id: string
): Promise<boolean> {
  const currentId = await execShellCommand(`cat "${filepath}" 2> /dev/null`)
  return currentId.trim() !== transaction_id
}

/**
 * Function for setting transaction_id
 * @param filepath {string} - filepath
 * @throws new Error with `stderr` in message
 * @returns Promise {Promise<string>} - returns promise of stdout
 */
export async function setTransactionId(
  filepath: string,
  transaction_id: string
): Promise<string> {
  const cmd = `echo "${transaction_id}" > "${filepath}" 2> /dev/null`
  if (process.env.IS_DUMMY) {
    console.log(cmd)
    return cmd
  }
  return execShellCommand(cmd)
}
