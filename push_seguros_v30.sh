#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Vencimientos: hover gris en las filas para indicar que son clickeables, igual que en polizas"
git push
