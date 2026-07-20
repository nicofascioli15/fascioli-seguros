#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "Fix: al eliminar el periodo de control mensual que coincidia con el vencimiento actual, volvia a aparecer al reabrir la poliza (habia una logica que lo recreaba automaticamente al abrir el detalle). Se elimino esa recreacion: ahora un periodo borrado queda borrado, los nuevos periodos solo los crea el alta de la poliza o el barrido automatico por fecha"
git push
