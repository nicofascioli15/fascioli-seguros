#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Seguros: soporte para renovacion de polizas. Al crear una poliza se puede marcar como Nueva o Renovacion (indicando la poliza existente que renueva); la poliza anterior queda con badge Renovada y se excluye de Vencimientos y del Dashboard"
git push
