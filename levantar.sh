#!/bin/bash
# ---------------------------------------------------------------------------
# NOMBRE: levantar.sh
#
# DESCRIPCION: Enciende las sucursales San José y Limón (contenedores de
# Docker) y actualiza los alias de Windows para encontrarlas:
#   sanjose             IP de Ubuntu, puerto 1436
#   limon               IP de Ubuntu, puerto 1437
#   corporativo_escazu  SQL Server de Windows (127.0.0.1, puerto 1433)
#
# ENTRADA: Ninguna. Se ejecuta en Ubuntu con:  ./levantar.sh
#
# SALIDA: Sucursales encendidas, alias actualizados y los datos para
# conectarse desde SSMS.
#
# OBJETIVO: Dejar los tres nodos listos después de reiniciar la computadora
# (la IP de Ubuntu cambia en cada reinicio).
# ---------------------------------------------------------------------------

# Trabajar en la carpeta donde está este archivo.
cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# PASO 1: Encender las sucursales
# WINIP = IP de Windows vista desde Ubuntu. Las sucursales la usan para
# llegar al Corporativo.
# ---------------------------------------------------------------------------
export WINIP=$(ip route show default | awk '{print $3}')
docker compose up -d


# ---------------------------------------------------------------------------
# PASO 2: Actualizar los alias de Windows
# IPUBUNTU = IP de Ubuntu vista desde Windows. El Corporativo y SSMS la usan
# para llegar a las sucursales.
# Los alias se guardan en el registro de Windows (versiones de 64 y 32 bits).
# ---------------------------------------------------------------------------
IPUBUNTU=$(hostname -I | awk '{print $1}')

PS=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe

"$PS" -NoProfile -Command "foreach (\$r in 'HKLM:\SOFTWARE\Microsoft\MSSQLServer\Client\ConnectTo','HKLM:\SOFTWARE\WOW6432Node\Microsoft\MSSQLServer\Client\ConnectTo') { Set-ItemProperty -Path \$r -Name sanjose -Value 'DBMSSOCN,$IPUBUNTU,1436' -ErrorAction Stop; Set-ItemProperty -Path \$r -Name limon -Value 'DBMSSOCN,$IPUBUNTU,1437' -ErrorAction Stop; Set-ItemProperty -Path \$r -Name corporativo_escazu -Value 'DBMSSOCN,127.0.0.1,1433' -ErrorAction Stop }" \
    && ALIAS_OK=1 || ALIAS_OK=0

# ---------------------------------------------------------------------------
# PASO 3: Mostrar el resultado
# ---------------------------------------------------------------------------
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