#!/usr/bin/env bash
IMAGE_NAME=test-container
DB_CONTAINER=postgres

docker build -t $IMAGE_NAME .

docker run -it --rm \
  -e DB_HOST=$DB_CONTAINER \
  -e DB_USER="postgres" \
  -e DB_PASS="secret" \
  -e DB_NAME="mydb" \
  -e DIFF_SCHEDULE="* * * * *" \
  -v "`pwd`/data:/data" \
  -v "`pwd`/cache:/cache" \
  -p 8080:80 \
  $IMAGE_NAME ${1:cron}