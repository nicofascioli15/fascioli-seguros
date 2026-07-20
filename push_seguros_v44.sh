#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: eliminar un periodo de control mensual no funcionaba cuando coincidia con el vencimiento actual de la poliza, porque el refresco lo volvia a crear automaticamente. Ahora las acciones puntuales (marcar, deshacer, eliminar) usan un refresco simple que no recrea nada"
git push
