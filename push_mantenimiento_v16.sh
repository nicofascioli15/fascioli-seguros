#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v16: fix flecha de los selects (el background inline pisaba el ícono)"
git push
