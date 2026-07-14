#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v21: adjuntar documentos y agregar reclamos por cada gestión desde el modal de Historial"
git push
