#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Contratos: categorias dinamicas administrables desde Configuracion (aparecen solas en el menu), boton 'agregar nueva empresa' encadenado en el formulario, y garantia de Obras seleccionable en meses o anios"
git push
