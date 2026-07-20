#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Polizas: reemplazar la fila de botones de ramo (que se iba a desbordar a medida que se agregan mas ramos) por un desplegable"
git push
