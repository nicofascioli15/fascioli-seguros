#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: el contador Vencen en 30d del portal (Hub) no coincidia con el del Dashboard porque no excluia las polizas renovadas ni las de renovacion mensual (Accidentes de trabajo). Ahora usa el mismo criterio en ambos lados"
git push
