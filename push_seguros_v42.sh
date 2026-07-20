#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Control mensual: agregar boton para eliminar un periodo individual (para poder borrar periodos de prueba)"
git push
