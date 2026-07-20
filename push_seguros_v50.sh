#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Pagos y cuotas: filas clickeables que abren un modal con el detalle ordenado de la cuota (poliza, compania, vencimiento, cobro) y accesos directos a Cobrar/Deshacer y a la poliza completa"
git push
