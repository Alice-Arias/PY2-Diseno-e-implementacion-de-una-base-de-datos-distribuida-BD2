#!/bin/bash
# ---------------------------------------------------------------------------
# NOMBRE: ejecutar_sql.sh
#
# DESCRIPCION: Ejecuta UN script SQL en el nodo o nodos indicados, sin abrir
# SSMS. Sirve para los scripts nuevos que se agreguen al repositorio después
# de la instalación inicial.
#
# ENTRADA: el archivo .sql y el destino.
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql corporativo
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql sanjose
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql limon
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql sucursales     (sanjose y limon)
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql todos          (los tres nodos)
# La contraseña de sa del Corporativo se pide al ejecutar, o se puede definir
# antes con:  export CORP_SA_PASS='...'
#
# SALIDA: El resultado del script de cada nodo, en pantalla.
#
# OBJETIVO: Que los dos integrantes apliquen los mismos cambios en sus
# computadoras con un solo comando.
# ---------------------------------------------------------------------------

set -u                      # Detenerse si se usa una variable sin valor.
cd "$(dirname "$0")"        # Trabajar en la carpeta donde está este archivo.

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
ARCHIVO="${1:-}"            # Primer dato: el script .sql
DESTINO="${2:-}"            # Segundo dato: dónde ejecutarlo


# ---------------------------------------------------------------------------
# Validar la entrada: deben venir los dos datos y el archivo debe existir.
# ---------------------------------------------------------------------------
if [ -z "$ARCHIVO" ] || [ -z "$DESTINO" ] || [ ! -f "$ARCHIVO" ]; then
    echo "Uso: ./ejecutar_sql.sh Script/archivo.sql corporativo|sanjose|limon|sucursales|todos"
    exit 1
fi

NOMBRE=$(basename "$ARCHIVO")   # Nombre del archivo sin la carpeta.


# ---------------------------------------------------------------------------
# NOMBRE: en_suc
# ENTRADA: contenedor (sanjose o limon) y contraseña de sa.
# DESCRIPCION: Copia el script al contenedor y lo ejecuta ahí.
# SALIDA: El resultado del script en esa sucursal.
# ---------------------------------------------------------------------------
en_suc() {
    local nodo=$1 pass=$2
    echo "-> $NOMBRE en $nodo"
    docker cp "$ARCHIVO" "$nodo":/tmp/"$NOMBRE" >/dev/null
    docker exec "$nodo" $SQLCMD -S localhost -U sa -P "$pass" -C -b -I -f 65001 -i /tmp/"$NOMBRE"
}


# ---------------------------------------------------------------------------
# NOMBRE: en_corp
# ENTRADA: contraseña de sa del Corporativo (la pide si no está definida).
# DESCRIPCION: Ejecuta el script en el Corporativo. Se conecta desde el
# contenedor sanjose, que ya tiene sqlcmd instalado.
# SALIDA: El resultado del script en el Corporativo.
# ---------------------------------------------------------------------------
en_corp() {
    if [ -z "${CORP_SA_PASS:-}" ]; then
        read -r -s -p "Contraseña de 'sa' del Corporativo: " CORP_SA_PASS; echo
    fi
    echo "-> $NOMBRE en corporativo"
    docker cp "$ARCHIVO" sanjose:/tmp/"$NOMBRE" >/dev/null
    docker exec sanjose $SQLCMD -S corporativo,1433 -U sa -P "$CORP_SA_PASS" -C -b -I -f 65001 -i /tmp/"$NOMBRE"
}


# ---------------------------------------------------------------------------
# Ejecutar según el destino. Con && el siguiente nodo solo se ejecuta si el
# anterior terminó bien.
# ---------------------------------------------------------------------------
case "$DESTINO" in
    corporativo) en_corp ;;
    sanjose)     en_suc sanjose 'SanJose#2026Pass' ;;
    limon)       en_suc limon   'Limon#2026Pass' ;;
    sucursales)  en_suc sanjose 'SanJose#2026Pass' && en_suc limon 'Limon#2026Pass' ;;
    todos)       en_corp && en_suc sanjose 'SanJose#2026Pass' && en_suc limon 'Limon#2026Pass' ;;
    *) echo "Destino no válido: $DESTINO"; exit 1 ;;
esac