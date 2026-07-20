#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Ajustes Accidentes de trabajo: 1) filtro 30/90/180 dias en Vencimientos ya no mezcla polizas vencidas (tienen su propia pestana); 2) el check de renovacion mensual solo aparece si el ramo es Accidentes de trabajo, y ya no es clickeable (es automatico); 3) moneda fija en \$; 4) las facturas se marcan Pagada solas al pasar la fecha de vencimiento, sin click manual"
git push
