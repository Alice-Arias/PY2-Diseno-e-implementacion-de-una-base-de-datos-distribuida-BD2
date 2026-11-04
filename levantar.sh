#!/bin/bash
cd "$(dirname "$0")"
export WINIP=$(ip route show default | awk "{print \$3}")
docker compose up -d
IPUBUNTU=$(hostname -I | awk "{print \$1}")
echo ""
echo "Nodos levantados. Para conectarse en SSMS:"
echo "  Corporativo -> ALICE_ARIAS          (Windows Authentication)"
echo "  San José    -> $IPUBUNTU,1434     (sa / SanJose#2026Pass)"
echo "  Limón       -> $IPUBUNTU,1435     (sa / Limon#2026Pass)"
