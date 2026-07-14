#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v20: fila clickeable abre el historial + borrar gestiones desde el modal de historial"
git push
