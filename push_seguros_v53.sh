#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Contratos y Mantenimiento comparten la misma cartera de edificios (mant_clientes): agregar boton eliminar edificio en ambos modulos, que borra en cascada extintores, tanques y contratos junto con sus documentos adjuntos en Storage"
git push
