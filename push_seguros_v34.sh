#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Renovacion de polizas: agregar boton Renovar poliza junto a Editar poliza (en el detalle de Polizas y en cada tarjeta de poliza dentro de Clientes), para renovar directo sin tener que volver a seleccionar cliente"
git push
