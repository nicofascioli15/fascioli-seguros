#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Nuevo modulo Contratos: ascensores, rampas, otros servicios y obras. Reusa la cartera de edificios de Mantenimiento, vigencia auto-renovable calculada en vivo (fecha de firma + vigencia en anios), modelo aparte para obras con garantia, catalogo de empresas por categoria, documentos adjuntos y activacion de la card en el Hub"
git push
