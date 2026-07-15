#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Paginado de 25 items por pagina en Clientes (Seguros y Mantenimiento), Documentos, Historial, Siniestros y Usuarios; fix: tipos de documento hardcodeados en ficha de cliente de Mantenimiento ahora usan DOCS_TIPOS compartido"
git push
