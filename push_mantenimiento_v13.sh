#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v13: importar edificios desde CSV (igual que Seguros)"
git push
