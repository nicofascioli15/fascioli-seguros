#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: las polizas vencidas dejaban de mostrarse en notificaciones/dashboard/vencimientos apenas pasaba la fecha. Ahora se siguen mostrando en rojo hasta que la poliza se renueve"
git push
