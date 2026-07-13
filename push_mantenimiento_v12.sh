#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v12: exportación rediseñada (detalle legible) + selector de alcance (vigentes/completados/historial)"
git push
