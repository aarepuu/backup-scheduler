/*
 *  Set of helper functions and common constants for dealing with SQL queries
 */

import { DBConfig } from '../config'

export type DBTable = {
  table: string
  filename: string
  transaction_id: string
}

export type DBShard = {
  table: string
  chunk: string
  start: string
  end: string
  filename: string
  transaction_id: string
}

// for getting normal tables
export const simpleTableQuery = `SELECT  "table_schema" || '.' || "table_name" FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type != 'VIEW';`

// for getting table names
export const tableQuery = `SELECT  "table_schema" || '.' || "table_name" FROM information_schema.tables WHERE table_schema NOT LIKE '_timescaledb_%' AND table_schema NOT LIKE 'timescaledb_information%' AND table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type != 'VIEW' AND table_name NOT IN ( SELECT table_name FROM "_timescaledb_catalog"."hypertable" );`

// for getting hypertablenames
export const hyperQuery = `SELECT "schema_name" || '.' || "table_name" FROM _timescaledb_catalog.hypertable;`

/**
 * Compiles a SQL command for PostgreSQL database
 * @param config {DBConfig} - database configurations
 * @returns {string} - returns the psql command
 */
export function sqlCommand(config: DBConfig, query: string): string {
  const cmd = `PGPASSWORD="${config.pass}" psql -h"${config.host}" -p"${config.port}" -U"${config.user}" "${config.name}" -A -t -c "${query}"`
  return cmd
}

/**
 * Compiles a SQL query for getting hypertable shards
 * @param hypertable {string} - hypertable name
 * @returns {string} - sql query string for hypertable shards
 */
export function getShards(hypertable: string): string {
  const shardsQuery = `SELECT  h."schema_name" || '.' || h."table_name" AS public_table, c."schema_name" || '.' || c."table_name" AS chunk_table, to_char(to_timestamp(ds.range_start / 1000 / 1000), 'DD-MM-YYYY') AS chunk_start, to_char(to_timestamp(ds.range_end / 1000 / 1000), 'DD-MM-YYYY') AS chunk_end, h.schema_name || '.' || h.table_name || '_' || to_char(to_timestamp(ds.range_start / 1000 / 1000), 'DDMMYYYY') || '_' || to_char(to_timestamp(ds.range_end / 1000 / 1000), 'DDMMYYYY') AS chunk_filename FROM "_timescaledb_catalog"."hypertable" h INNER JOIN "_timescaledb_catalog"."chunk" c ON c.hypertable_id = h.id INNER JOIN "_timescaledb_catalog"."dimension" d ON d.hypertable_id = c.hypertable_id INNER JOIN "_timescaledb_catalog"."dimension_slice" ds ON ds.id = c.id WHERE h."schema_name" || '.' || h."table_name" = '${hypertable}' ORDER BY ds.range_start ASC`
  return shardsQuery
}

/**
 * Compiles a SQL query for getting table transaction_id
 * @param table {string} - table name
 * @returns {string} - sql query string for table transaction_id
 */
export function getTransactionId(table: string): string {
  const transactionQuery = `SELECT MAX(xmin::text::integer) FROM ${table} GROUP BY true;`
  return transactionQuery
}
