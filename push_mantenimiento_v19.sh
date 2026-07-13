#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v19: cards del dashboard clickeables y separadas por Extintores/Tanques, filtran la lista al hacer click"
git push
