#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v8: extras con cantidad (mangueras, válvulas, carteles, colocación) + formulario más compacto"
git push
