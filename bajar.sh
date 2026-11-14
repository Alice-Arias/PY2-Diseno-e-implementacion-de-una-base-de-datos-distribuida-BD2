#!/bin/bash
# ---------------------------------------------------------------------------
# NOMBRE: apagar.sh
#
# DESCRIPCION: Apaga las sucursales San José y Limón (contenedores de Docker).
# Los datos NO se borran: quedan guardados en los volúmenes.
#
# ENTRADA: Ninguna. Se ejecuta en Ubuntu con:  ./apagar.sh
#
# SALIDA: Contenedores sanjose y limon detenidos y eliminados (se vuelven a
# crear con ./levantar.sh).
#
# OBJETIVO: Liberar memoria de la computadora cuando no se está trabajando.
# ---------------------------------------------------------------------------

# Trabajar en la carpeta donde está este archivo (donde está docker-compose.yml).
cd "$(dirname "$0")"

# docker-compose.yml exige la variable WINIP aunque solo se vaya a apagar.
export WINIP=$(ip route show default | awk "{print \$3}")

# Apagar las dos sucursales.
docker compose down