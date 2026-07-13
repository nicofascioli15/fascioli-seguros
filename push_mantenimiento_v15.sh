#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v15: fix exportación — 'vigentes completados' ya no choca con filtros de días/estado en pantalla"
git push
