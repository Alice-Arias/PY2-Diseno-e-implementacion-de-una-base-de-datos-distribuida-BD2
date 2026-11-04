#!/bin/bash
# ---------------------------------------------------------------------------
# levantar.sh
# Levanta los nodos San José y Limón, y actualiza los alias de Windows:
#   sanjose            -> IP actual de Ubuntu (WSL), puerto 1436
#   limon              -> IP actual de Ubuntu (WSL), puerto 1437
#   corporativo_escazu -> SQL Server de Windows (127.0.0.1, puerto 1433)
# La IP de Ubuntu cambia al reiniciar, por eso se actualiza cada vez.
# ---------------------------------------------------------------------------

cd "$(dirname "$0")"

# IP de Windows vista desde Ubuntu: los contenedores llegan al Corporativo por aquí.
export WINIP=$(ip route show default | awk '{print $3}')
docker compose up -d

# IP de Ubuntu vista desde Windows: el Corporativo y SSMS llegan a las sucursales por aquí.
IPUBUNTU=$(hostname -I | awk '{print $1}')

PS=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe

"$PS" -NoProfile -Command "foreach (\$r in 'HKLM:\SOFTWARE\Microsoft\MSSQLServer\Client\ConnectTo','HKLM:\SOFTWARE\WOW6432Node\Microsoft\MSSQLServer\Client\ConnectTo') { Set-ItemProperty -Path \$r -Name sanjose -Value 'DBMSSOCN,$IPUBUNTU,1436' -ErrorAction Stop; Set-ItemProperty -Path \$r -Name limon -Value 'DBMSSOCN,$IPUBUNTU,1437' -ErrorAction Stop; Set-ItemProperty -Path \$r -Name corporativo_escazu -Value 'DBMSSOCN,127.0.0.1,1433' -ErrorAction Stop }" \
    && ALIAS_OK=1 || ALIAS_OK=0

echo ""
echo "Nodos levantados."
if [ "$ALIAS_OK" = "1" ]; then
    echo "Alias de Windows actualizados: sanjose -> $IPUBUNTU,1436 | limon -> $IPUBUNTU,1437"
else
    echo "AVISO: no se pudieron actualizar los alias de Windows (falta el permiso de una sola vez)."
fi
echo ""
echo "Para conectarse en SSMS:"
echo "  Corporativo -> corporativo_escazu   (Windows Authentication)"
echo "  San José    -> sanjose              (sa / SanJose#2026Pass)"
echo "  Limón       -> limon                (sa / Limon#2026Pass)"