# Backup Scheduler

Schedule regular backups to be run on your databases using this docker image. Inspired by [robb-j/mysql-local-backup](https://github.com/robb-j/mysql-local-backup), setup with [aarepuu/ts-node-base](https://github.com/aarepuu/ts-node-base/).

## Scheduler Features

- backup postgres or timescaledb databases
- schedule `full`, `schema` or `diff` backups
- run local or remote backups (using scp)
- monitoring service for pinging scheduler status

## Sample Usage for local backups

```bash
docker run -it --rm \
  -e TYPE="timescale" \
  -e DB_HOST=database \
  -e DB_USER="postgres" \
  -e DB_PASS="secret" \
  -e DB_NAME="mydb" \
  -e DIFF_SCHEDULE="* * * * *" \
  -v "/my_massive_drive:/data" \
  -v "/my_cache_directory:/cache" \
  --link database \
  -p 8080:80 \
  aarepuu/backup-scheduler
```

### or

```yml
backup:
  image: aarepuu/backup-scheduler
  restart: unless-stopped
  environment:
    TYPE: timescale
    DIFF_SCHEDULE: 20 4 5 * *
  env_file:
    - secrets.env
  volumes:
    - ./my_massive_drive:/data
    - ./my_cache_directory:/cache
  ports:
    - 8080:80
```

> Where `secrets.env` has DB_HOST, DB_PORT, DB_USER, DB_PASS & DB_NAME in it

## Sample usage for remote backups

```bash
docker run -it --rm \
  -e TYPE="timescale" \
  -e DB_HOST=database \
  -e DB_USER="postgres" \
  -e DB_PASS="secret" \
  -e DB_NAME="mydb" \
  -e DIFF_SCHEDULE="* * * * *" \
  -e IS_REMOTE="true" \
  -e REMOTE_HOST=storage \
  -e REMOTE_USER="backup" \
  -e REMOTE_PATH="/srv/data/db" \
  -e REMOTE_KEY=$(cat private_key) \
  --link database \
  -p 8080:80 \
  aarepuu/backup-scheduler
```

### or

```yml
backup:
  image: aarepuu/backup-scheduler
  restart: unless-stopped
  environment:
    TYPE: timescale
    DIFF_SCHEDULE: 20 4 5 * *
    IS_REMOTE: true
  env_file:
    - secrets.env
  volumes:
    - ./my_cache_directory:/cache
  ports:
    - 8080:80
```

> Where `secrets.env` has DB_HOST, DB_USER, DB_PASS, DB_NAME, REMOTE_HOST, REMOTE_USER, REMOTE_PATH & REMOTE_KEY in it

**_To read your private key to single line for pasting into `secrets.env`_**

```bash
awk -v ORS='\\n' '1' private_key | pbcopy
```

**_To use named volumes for diff cache_**

```bash
docker volume create my_cache_volume
```

## Variables

| Name            | Usage                                    | Values                                  |
| --------------- | ---------------------------------------- | --------------------------------------- |
| TYPE            | The type of your `database`              | `postgres` or `timescale`               |
| DB_HOST         | The hostname of your `database`          | defaults to `5432`                      |
| DB_PORT         | The port number of your `database`       |                                         |
| DB_USER         | The username of your `database`          |                                         |
| DB_PASS         | The password of your `database`          |                                         |
| DB_NAME         | The name of your `database`              |                                         |
| DIFF_SCHEDULE   | The schedule to run the diff backup on   | [\* \* \* \* \*](https://crontab.guru/) |
| SCHEMA_SCHEDULE | The schedule to run the schema backup on | (optional)                              |
| FULL_SCHEDULE   | The schedule to run the dull backup on   | (optional)                              |
| IS_REMOTE       | To copy files to `remote` location       | (optional)                              |
| REMOTE_HOST     | The hostname of your `remote` location   | (optional)                              |
| REMOTE_USER     | The username of your `remote` location   | (optional)                              |
| REMOTE_PATH     | The copy path on your `remote` location  | (optional)                              |
| REMOTE_KEY      | Private key string for `remote` location | (optional)                              |

## Dev Commands

```bash
# Run in dev mode and restart on file changes
npm run dev

# Lint the source code
npm run lint

# Manually format code
# -> This repo runs prettier on git-stage, so committed code is always formatted
npm run prettier

# Run the unit tests
# -> Looks for .spec.ts files in the src directory
npm test

# Generate code coverage in coverage/
npm run coverage
```

## TODOs/Ideas

- add file backup scheduler
- add mysql connector
- better error handling for node `child_process`
- write tests
