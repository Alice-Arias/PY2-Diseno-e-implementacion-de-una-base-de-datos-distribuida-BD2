#!/bin/bash
export WINIP=$(ip route show default | awk "{print \$3}")
echo "Corporativo (Windows) en: $WINIP"
docker compose up -d
