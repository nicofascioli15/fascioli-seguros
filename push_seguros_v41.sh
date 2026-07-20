#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Accidentes de trabajo: el campo Vencimiento vuelve a pedirse en el alta (no se oculta). El pasaje automatico a Pagada ahora es el dia 5 del mes SIGUIENTE al vencimiento del periodo (no en el momento del vencimiento), avanzando asi sucesivamente. Ademas estas polizas ya no aparecen en Vencimientos/Dashboard, su control es exclusivamente mensual"
git push
