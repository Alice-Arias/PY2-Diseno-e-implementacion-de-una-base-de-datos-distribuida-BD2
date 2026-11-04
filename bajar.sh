#!/bin/bash
export WINIP=$(ip route show default | awk "{print \$3}")
docker compose down
