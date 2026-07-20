#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Hub: agregar contador de polizas vencidas en la card de Seguros, con el mismo criterio (excluye renovadas y renovacion mensual) que el resto de la app"
git push
