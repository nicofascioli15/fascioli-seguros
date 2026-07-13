#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v17: rediseño del dashboard (stats con íconos, próximos vencimientos destacados, sin conteo de edificios)"
git push
