#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: boton Renovar poliza en el detalle no abria el modal (el modal solo existia en la vista de lista, ahora se comparte entre lista y detalle)"
git push
