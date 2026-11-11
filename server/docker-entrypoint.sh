#!/bin/sh
set -e
# Starts the server only. Migrations run in a separate job (docker-compose `migrate`, Cloud Run job `cafe-migrate`).
# `exec` makes node PID 1 so it receives SIGTERM from Cloud Run for a graceful shutdown.
exec "$@"
