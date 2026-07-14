#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v23: modal propio de confirmacion al eliminar (historial, documentos, reclamos, empresas) en vez del confirm() nativo del navegador"
git push
