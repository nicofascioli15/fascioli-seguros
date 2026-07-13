#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Mantenimiento v10: exportación PDF/Excel con todos los datos de extintores (tipos, ensayo hidrostático, extras)"
git push
