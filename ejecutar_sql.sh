#!/bin/bash
# ---------------------------------------------------------------------------
# ejecutar_sql.sh
#
# Ejecuta UN script SQL en el nodo o nodos indicados, sin abrir SSMS.
# Sirve para los scripts nuevos que se agreguen al repositorio después de la
# instalación inicial.
#
# Uso:
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql corporativo
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql sanjose
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql limon
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql sucursales     (sanjose y limon)
#   ./ejecutar_sql.sh Script/12_Ejemplo.sql todos          (los tres nodos)
#
# La contraseña de sa del Corporativo se pide al ejecutar, o se puede definir
# antes con:  export CORP_SA_PASS='...'
# ---------------------------------------------------------------------------

set -u
cd "$(dirname "$0")"

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
ARCHIVO="${1:-}"
DESTINO="${2:-}"

if [ -z "$ARCHIVO" ] || [ -z "$DESTINO" ] || [ ! -f "$ARCHIVO" ]; then
    echo "Uso: ./ejecutar_sql.sh Script/archivo.sql corporativo|sanjose|limon|sucursales|todos"
    exit 1
fi

NOMBRE=$(basename "$ARCHIVO")

en_suc() {
    local nodo=$1 pass=$2
    echo "-> $NOMBRE en $nodo"
    docker cp "$ARCHIVO" "$nodo":/tmp/"$NOMBRE" >/dev/null
    docker exec "$nodo" $SQLCMD -S localhost -U sa -P "$pass" -C -b -f 65001 -i /tmp/"$NOMBRE"
}

en_corp() {
    if [ -z "${CORP_SA_PASS:-}" ]; then
        read -r -s -p "Contraseña de 'sa' del Corporativo: " CORP_SA_PASS; echo
    fi
    echo "-> $NOMBRE en corporativo"
    docker cp "$ARCHIVO" sanjose:/tmp/"$NOMBRE" >/dev/null
    docker exec sanjose $SQLCMD -S corporativo,1433 -U sa -P "$CORP_SA_PASS" -C -b -f 65001 -i /tmp/"$NOMBRE"
}

case "$DESTINO" in
    corporativo) en_corp ;;
    sanjose)     en_suc sanjose 'SanJose#2026Pass' ;;
    limon)       en_suc limon   'Limon#2026Pass' ;;
    sucursales)  en_suc sanjose 'SanJose#2026Pass' && en_suc limon 'Limon#2026Pass' ;;
    todos)       en_corp && en_suc sanjose 'SanJose#2026Pass' && en_suc limon 'Limon#2026Pass' ;;
    *) echo "Destino no válido: $DESTINO"; exit 1 ;;
esac
