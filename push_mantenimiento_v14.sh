#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v14: estilo propio para selects (fix Safari) + exportación respeta filtros activos"
git push
