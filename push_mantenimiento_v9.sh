#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v9: wizard de 2 pasos (edificio primero) al crear gestión + historial completo con todos los datos"
git push
