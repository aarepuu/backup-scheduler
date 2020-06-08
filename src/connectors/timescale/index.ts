import { DBConfig, RemoteConfig } from '../../config'
import { DBConnector } from '../interfaces'
import { execShellCommand } from '../../utils'
import { copyToRemote } from '../../helpers/remote'
import {
  fetchTransactionFiles,
  isModified,
  setTransactionId
} from '../../helpers/cache'
import {
  DBTable,
  DBShard,
  tableQuery,
  hyperQuery,
  sqlCommand,
  getShards,
  getTransactionId
} from '../../helpers/sql'

const backupTables = async (
  config: DBConfig,
  table_list: string[],
  transaction_files: string[]
): Promise<DBTable[]> => {
  const toBackup = new Array<DBTable>()
  for (const table of table_list) {
    const transaction_id = await execShellCommand(
      sqlCommand(config, getTransactionId(table))
    )
    const filename = table.replace(/[^A-Z0-9_.]/gi, '')
    let modified = true
    if (transaction_files.includes(filename)) {
      modified = await isModified(
        `${config.cache_dir}/${filename}`,
        transaction_id.trim()
      )
    }
    if (transaction_id && modified) {
      toBackup.push({ table, filename, transaction_id: transaction_id.trim() })
    }
  }
  return toBackup
}

const backupShards = async (
  config: DBConfig,
  shardsList: string[],
  transactionFiles: string[]
): Promise<DBShard[]> => {
  const toBackup = new Array<DBShard>()
  for (const row of shardsList) {
    const shard = row.split('|')
    const transaction_id = await execShellCommand(
      sqlCommand(config, getTransactionId(shard[1]))
    )
    let modified = true
    if (transactionFiles.includes(shard[4])) {
      modified = await isModified(
        `${config.cache_dir}/${shard[4]}`,
        transaction_id.trim()
      )
    }
    if (transaction_id && modified) {
      toBackup.push({
        table: shard[0],
        chunk: shard[1],
        start: shard[2],
        end: shard[3],
        filename: shard[4],
        transaction_id: transaction_id.trim()
      })
    }
  }
  return toBackup
}
const dumpTableToSQL = async (
  config: DBConfig,
  table: string,
  filename: string,
  tablename?: string
): Promise<string> => {
  let cmd: string = ''
  if (tablename) {
    cmd = `PGPASSWORD="${config.pass}" pg_dump -h"${config.host}" -p"${config.port}" -U"${config.user}" "${config.name}" --data-only --format="plain" --table="${table}" | sed -e 's/'"${table}"'/'"${tablename}"'/'| gzip > "${config.data_dir}/${filename}.sql.gz"`
  } else {
    cmd = `PGPASSWORD="${config.pass}" pg_dump -h"${config.host}" -p"${config.port}" -U"${config.user}" "${config.name}" --data-only --format="plain" --table="${table}" | gzip > "${config.data_dir}/${filename}.sql.gz"`
  }
  if (process.env.IS_DUMMY) {
    console.log(cmd)
    return cmd
  }
  return execShellCommand(cmd)
}

const schema = async (
  config: DBConfig,
  remote: RemoteConfig
): Promise<string> => {
  try {
    const cmd = `PGPASSWORD="${config.pass}" pg_dump -h"${config.host}" -p"${
      config.port
    }" -U"${config.user}" "${
      config.name
    }" --schema --format="plain" | gzip > "${config.data_dir}/${
      config.name
    }_schema_${new Date().toISOString()}.sql.gz"`
    if (process.env.IS_DUMMY) {
      console.log(cmd)
      return cmd
    }
    return execShellCommand(cmd)
  } catch (error) {
    console.log(`Error executing schema backup: ${error}`)
    process.exit(1)
  }
}

const diff = async (config: DBConfig, remote: RemoteConfig): Promise<void> => {
  try {
    let transactionIdPromises: Promise<string>[] = new Array<Promise<string>>()

    // get transactionId database
    const transactionFiles = await fetchTransactionFiles(config.cache_dir)

    // normal tables backup
    const getNormalTables = await execShellCommand(
      sqlCommand(config, tableQuery)
    )
    // clean tablelist
    const normalTables = getNormalTables.split('\n').filter(table => table)

    // look for new and updated tables
    const toBackupNormal = await backupTables(
      config,
      normalTables,
      transactionFiles
    )

    // run backups
    for (const table of toBackupNormal) {
      await dumpTableToSQL(config, table.table, table.filename)
      // do remote copy?
      if (remote.host) {
        await copyToRemote(
          `${config.data_dir}/${table.filename}.sql.gz`,
          remote
        )
        console.log(`File transfer successful for ${table.filename}.sql.gz`)
      }
      // transactionIdPromises.push(
      await setTransactionId(
        `${config.cache_dir}/${table.filename}`,
        table.transaction_id
      )
      // )
    }

    // hyper tables backup
    const getHyperTables = await execShellCommand(
      sqlCommand(config, hyperQuery)
    )
    // clean hypertablelist
    const hyperTables = getHyperTables.split('\n').filter(table => table)
    // run backups
    for (const hypertable of hyperTables) {
      let getHyperShards = await execShellCommand(
        sqlCommand(config, getShards(hypertable))
      )
      const shardsCollection = getHyperShards.split('\n').filter(row => row)
      const toBackupShards = await backupShards(
        config,
        shardsCollection,
        transactionFiles
      )
      for (const shard of toBackupShards) {
        await dumpTableToSQL(config, shard.chunk, shard.filename, shard.table)
        // do remote copy?
        if (remote.host) {
          await copyToRemote(
            `${config.data_dir}/${shard.filename}.sql.gz`,
            remote
          )
          console.log(`File transfer successful for ${shard.filename}.sql.gz`)
        }
        // transactionIdPromises.push(
        await setTransactionId(
          `${config.cache_dir}/${shard.filename}`,
          shard.transaction_id
        )
        // )
      }
    }
    // await Promise.all(transactionIdPromises)
  } catch (error) {
    console.log(`Error executing diff backup: ${error}`)
    process.exit(1)
  }
}

const full = async (
  config: DBConfig,
  remote: RemoteConfig
): Promise<string> => {
  try {
    const cmd = `PGPASSWORD="${config.pass}" pg_dump -h"${config.host}" -p"${
      config.port
    }" -U"${config.user}" "${config.name}" --format="plain" | gzip > "${
      config.data_dir
    }/${config.name}_full_${new Date().toISOString()}.sql.gz"`
    if (process.env.IS_DUMMY) {
      console.log(cmd)
      return cmd
    }
    return execShellCommand(cmd)
  } catch (error) {
    console.log(`Error executing full backup: ${error}`)
    process.exit(1)
  }
}

export default (): DBConnector => {
  return {
    diff,
    schema,
    full
  }
}
