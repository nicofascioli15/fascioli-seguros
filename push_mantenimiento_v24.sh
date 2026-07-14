#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v24: subida de multiples documentos a la vez (antes solo tomaba el primer archivo) y nuevos tipos de documento (Presupuesto / Factura o recibo / Otro)"
git push
