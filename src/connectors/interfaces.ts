import { DBConfig, RemoteConfig } from '../config'

export interface DBConnector {
  diff(config: DBConfig, remote?: RemoteConfig): Promise<void>
  schema(config: DBConfig, remote?: RemoteConfig): Promise<string>
  full(config: DBConfig, remote?: RemoteConfig): Promise<string>
}

export interface FileConnector {}
