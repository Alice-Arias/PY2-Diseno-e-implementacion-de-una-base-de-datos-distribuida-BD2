#!/bin/bash
# ---------------------------------------------------------------------------
# instalar_todo.sh
#
# Instala desde cero el sistema distribuido en una computadora nueva:
#   1. Levanta los contenedores San José y Limón.
#   2. Restaura WideWorldImporters en los tres nodos.
#   3. Ejecuta los scripts de la carpeta Script en orden, cada uno en su nodo.
#
# Requisitos previos (una sola vez, ver INSTALACION.md):
#   - SQL Server 2022 Developer en Windows, con TCP/IP en 1433, firewall abierto,
#     usuario sa habilitado y SQL Server Agent corriendo.
#   - Permiso sobre los alias de Windows (bloque de PowerShell de INSTALACION.md).
#   - Docker instalado dentro de Ubuntu (WSL).
#
# Uso:
#   ./instalar_todo.sh                         (busca o descarga el .bak)
#   ./instalar_todo.sh /ruta/WideWorldImporters-Full.bak
#
# NO usar en una computadora donde el sistema ya está instalado.
# ---------------------------------------------------------------------------

set -u
cd "$(dirname "$0")"

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
SJ_PASS='SanJose#2026Pass'
LM_PASS='Limon#2026Pass'
URL_BAK='https://github.com/Microsoft/sql-server-samples/releases/download/wide-world-importers-v1.0/WideWorldImporters-Full.bak'

paso()  { echo; echo "=================================================================="; echo " $1"; echo "=================================================================="; }
falla() { echo; echo "ERROR: $1"; echo "La instalación se detuvo. Revise el mensaje de arriba."; exit 1; }

# sqlcmd dentro de una sucursal (contenedor, password, argumentos...)
sql_suc()  { local c=$1 p=$2; shift 2; docker exec "$c" $SQLCMD -S localhost -U sa -P "$p" -C -b -I -f 65001 "$@"; }
# sqlcmd hacia el Corporativo (se ejecuta desde el contenedor sanjose)
sql_corp() { docker exec sanjose $SQLCMD -S corporativo,1433 -U sa -P "$CORP_PASS" -C -b -I -f 65001 "$@"; }

valor() { tr -d '[:space:]'; }

# ---------------------------------------------------------------------------
paso "0. Datos iniciales"
# ---------------------------------------------------------------------------

BAK="${1:-}"
if [ -z "$BAK" ]; then
    BAK=$(find ~ /mnt/c/Users/*/Downloads -maxdepth 4 -iname 'WideWorldImporters-Full.bak' 2>/dev/null | head -1)
fi
if [ -z "$BAK" ]; then
    echo "No se encontró WideWorldImporters-Full.bak. Descargándolo (unos 120 MB)..."
    mkdir -p bak
    wget -q --show-progress -O bak/WideWorldImporters-Full.bak "$URL_BAK" || falla "No se pudo descargar el backup."
    BAK=bak/WideWorldImporters-Full.bak
fi
echo "Backup: $BAK"

read -r -s -p "Contraseña de 'sa' del SQL Server de Windows (Corporativo): " CORP_PASS
echo

# ---------------------------------------------------------------------------
paso "1. Levantando San José y Limón"
# ---------------------------------------------------------------------------

./levantar.sh || falla "levantar.sh falló."

for nodo in sanjose limon; do
    [ "$nodo" = "sanjose" ] && p=$SJ_PASS || p=$LM_PASS
    echo -n "Esperando a que SQL Server arranque en $nodo"
    for i in $(seq 1 45); do
        sql_suc "$nodo" "$p" -Q "SELECT 1" >/dev/null 2>&1 && break
        echo -n "."; sleep 2
        [ "$i" = "45" ] && falla "SQL Server no respondió en $nodo."
    done
    echo " listo."
done

echo -n "Probando conexión al Corporativo... "
sql_corp -h -1 -Q "SET NOCOUNT ON; SELECT @@SERVERNAME" >/dev/null 2>&1 \
    || falla "No se pudo conectar al SQL Server de Windows. Revise los requisitos de INSTALACION.md (TCP/IP 1433, firewall, contraseña de sa)."
echo "listo."

# ---------------------------------------------------------------------------
paso "2. Verificando que no haya una instalación previa"
# ---------------------------------------------------------------------------

YA=$(sql_corp -h -1 -Q "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID('WideWorldImporters.dbo.ConfigNodo') IS NULL THEN 0 ELSE 1 END" | valor)
if [ "$YA" = "1" ]; then
    falla "El Corporativo ya tiene el sistema instalado. Este script es solo para computadoras nuevas."
fi
echo "No hay instalación previa."

# ---------------------------------------------------------------------------
paso "3. Restaurando WideWorldImporters en las sucursales"
# ---------------------------------------------------------------------------

RESTORE_LINUX="RESTORE DATABASE WideWorldImporters FROM DISK='/var/opt/mssql/backup/WideWorldImporters-Full.bak' WITH MOVE 'WWI_Primary' TO '/var/opt/mssql/data/WideWorldImporters.mdf', MOVE 'WWI_UserData' TO '/var/opt/mssql/data/WideWorldImporters_UserData.ndf', MOVE 'WWI_Log' TO '/var/opt/mssql/data/WideWorldImporters.ldf', MOVE 'WWI_InMemory_Data_1' TO '/var/opt/mssql/data/WideWorldImporters_InMemory_Data_1', REPLACE"

for nodo in sanjose limon; do
    [ "$nodo" = "sanjose" ] && p=$SJ_PASS || p=$LM_PASS
    echo "Restaurando en $nodo..."
    docker exec "$nodo" mkdir -p /var/opt/mssql/backup
    docker cp "$BAK" "$nodo":/var/opt/mssql/backup/WideWorldImporters-Full.bak >/dev/null
    sql_suc "$nodo" "$p" -Q "$RESTORE_LINUX" >/dev/null || falla "No se pudo restaurar en $nodo."
done

# ---------------------------------------------------------------------------
paso "4. Restaurando WideWorldImporters en el Corporativo"
# ---------------------------------------------------------------------------

mkdir -p /mnt/c/SQLBackups
cp "$BAK" /mnt/c/SQLBackups/WideWorldImporters-Full.bak
/mnt/c/Windows/System32/icacls.exe 'C:\SQLBackups' /grant 'NT SERVICE\MSSQLSERVER:(OI)(CI)RX' /T >/dev/null \
    || falla "No se pudo dar permiso de lectura a C:\\SQLBackups."

cat > /tmp/restaurar_corporativo.sql <<'EOF'
USE master;
IF DB_ID('WideWorldImporters') IS NOT NULL
    ALTER DATABASE WideWorldImporters SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DECLARE @data NVARCHAR(400) = CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(400));
DECLARE @log  NVARCHAR(400) = CAST(SERVERPROPERTY('InstanceDefaultLogPath')  AS NVARCHAR(400));
DECLARE @sql NVARCHAR(MAX) = N'
RESTORE DATABASE WideWorldImporters
FROM DISK = ''C:\SQLBackups\WideWorldImporters-Full.bak''
WITH MOVE ''WWI_Primary''         TO ''' + @data + N'WideWorldImporters.mdf'',
     MOVE ''WWI_UserData''        TO ''' + @data + N'WideWorldImporters_UserData.ndf'',
     MOVE ''WWI_Log''             TO ''' + @log  + N'WideWorldImporters.ldf'',
     MOVE ''WWI_InMemory_Data_1'' TO ''' + @data + N'WideWorldImporters_InMemory_Data_1'',
     REPLACE;';
EXEC (@sql);
EOF
docker cp /tmp/restaurar_corporativo.sql sanjose:/tmp/restaurar_corporativo.sql >/dev/null
sql_corp -i /tmp/restaurar_corporativo.sql >/dev/null || falla "No se pudo restaurar en el Corporativo."
echo "Restaurado."

# ---------------------------------------------------------------------------
paso "5. Ejecutando los scripts del proyecto"
# ---------------------------------------------------------------------------

docker cp Script sanjose:/tmp/ >/dev/null
docker cp Script limon:/tmp/   >/dev/null

corp() { echo "-> $1 en corporativo"; sql_corp -i "/tmp/Script/$1" >/tmp/salida.log 2>&1 || { cat /tmp/salida.log; falla "$1 falló en el Corporativo."; }; }
sj()   { echo "-> $1 en sanjose";     sql_suc sanjose "$SJ_PASS" -i "/tmp/Script/$1" >/tmp/salida.log 2>&1 || { cat /tmp/salida.log; falla "$1 falló en sanjose."; }; }
lm()   { echo "-> $1 en limon";       sql_suc limon   "$LM_PASS" -i "/tmp/Script/$1" >/tmp/salida.log 2>&1 || { cat /tmp/salida.log; falla "$1 falló en limon."; }; }

corp 01_Corporativo_Fragmentacion.sql
echo "   (la fragmentación de las sucursales tarda unos minutos cada una)"
sj   02_Sucursal_Fragmentacion.sql
lm   02_Sucursal_Fragmentacion.sql
corp 03_Corporativo_LoginEnlace.sql
sj   04_Sucursal_LinkedServer.sql
lm   04_Sucursal_LinkedServer.sql
sj   05_Sucursal_LoginEnlace.sql
lm   05_Sucursal_LoginEnlace.sql
corp 06_Corporativo_LinkedServers.sql
corp 07_Todos_PrepararCatalogo.sql
sj   07_Todos_PrepararCatalogo.sql
lm   07_Todos_PrepararCatalogo.sql
corp 08_Corporativo_Replicacion.sql
corp 09_Corporativo_Usuarios.sql
corp 10_Corporativo_SeguridadApp.sql
sj   11_Sucursal_SeguridadApp.sql
lm   11_Sucursal_SeguridadApp.sql
sj   12_Sucursal_Sinonimos.sql
lm   12_Sucursal_Sinonimos.sql
sj   13_Sucursal_Procedimientos.sql
lm   13_Sucursal_Procedimientos.sql
corp 14_Corporativo_Catalogo.sql
sj   15_Sucursal_Productos.sql
lm   15_Sucursal_Productos.sql
corp 16_Corporativo_Estadisticas.sql

# ---------------------------------------------------------------------------
paso "6. Verificación final"
# ---------------------------------------------------------------------------

sql_corp -Q "SET NOCOUNT ON;
SELECT N'San José' AS Sucursal,
       (SELECT COUNT(*) FROM LS_SANJOSE.WideWorldImporters.Sales.Invoices) AS FacturasSucursal,
       (SELECT COUNT(*) FROM WideWorldImporters.Sales.Invoices WHERE SucursalID = 1) AS FacturasCorporativo
UNION ALL
SELECT N'Limón',
       (SELECT COUNT(*) FROM LS_LIMON.WideWorldImporters.Sales.Invoices),
       (SELECT COUNT(*) FROM WideWorldImporters.Sales.Invoices WHERE SucursalID = 2);"

echo
echo "Instalación completa. Los números de cada fila deben coincidir (35254 y 35256)."
echo "Desde ahora, para trabajar solo hace falta: ./levantar.sh"
