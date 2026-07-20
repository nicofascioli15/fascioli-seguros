#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Control mensual para polizas de renovacion automatica (ej. Accidentes de trabajo - BPS): checkbox al crear la poliza, seccion de control mensual (Pendiente/Controlado/Pagado) en el detalle, avance automatico del vencimiento al marcar pagado"
git push
