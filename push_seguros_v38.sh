#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Dashboard: separar polizas vencidas en su propia card (antes se mezclaban con Vencen en 30 dias). Wizard de nueva poliza: al elegir el ramo Accidentes de trabajo se tilda solo Se renueva sola cada mes"
git push
