#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Seguros: agregar renovacion de polizas tambien al crear una poliza desde la ficha de Clientes (antes solo estaba en Polizas)"
git push
