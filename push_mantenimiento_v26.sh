#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v26: separar catalogo de Empresas por Extintores/Tanques de agua (columna tabla en mant_empresas) y agregar Analisis de potabilidad a los tipos de documento de Tanques"
git push
