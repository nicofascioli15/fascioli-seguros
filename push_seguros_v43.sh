#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Reemplazar el confirm() del navegador al eliminar un periodo de control mensual por un modal con el mismo diseno que el resto de la app"
git push
