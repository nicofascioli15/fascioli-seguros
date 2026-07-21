#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: al select de Corredor en el modal de Nueva poliza/Renovacion desde Clientes le faltaba la opcion 'Otro (ingresar manualmente)', ya estaba en Polizas"
git push
