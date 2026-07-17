#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Renovacion de polizas: al seleccionar la poliza a renovar se autocompletan ramo, compania, corredor, moneda, cantidad de cuotas, nota y campos especificos del ramo. Numero, vencimiento, fechas de cuotas y adjunto quedan vacios para completar"
git push
