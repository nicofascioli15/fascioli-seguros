#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: a la tabla de polizas le faltaba el th vacio para la columna del boton Eliminar"
git push
