#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Seguros: filas de Vencimiento de polizas ahora son clickeables y abren la poliza (con boton para volver a vencimientos); calendario del DatePicker ahora arranca en enero 2021"
git push
