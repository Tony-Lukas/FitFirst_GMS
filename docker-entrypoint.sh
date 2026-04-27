#!/bin/sh
set -eu

node socket-server.js &
socket_pid=$!

cleanup() {
  kill "$socket_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}" &
app_pid=$!

wait "$app_pid"
