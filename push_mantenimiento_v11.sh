#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v11: Configuración propia (catálogo de empresas), independiente de Seguros"
git push
