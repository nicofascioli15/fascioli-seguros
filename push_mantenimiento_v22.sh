#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v22: sacar paneles redundantes del dashboard, dejar solo las cards clickeables"
git push
