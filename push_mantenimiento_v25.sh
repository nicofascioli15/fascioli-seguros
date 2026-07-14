#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "ActionsMenu: el menu de acciones (...) se abre hacia arriba cuando no entra debajo del boton, para que no quede cortado en filas cercanas al fondo de la pantalla"
git push
