# MedCotiza · Cotizador de equipamiento médico

Simulador web de cotización de equipamiento médico para instituciones de salud. Proyecto final del curso de JavaScript.

## Circuito del simulador

1. **Catálogo**: se cargan los equipos desde `data/equipos.json`. Se pueden buscar por texto, filtrar por categoría y ordenar.
2. **Cotización**: se agregan equipos, se modifican cantidades (respetando el stock), se quitan o se vacía la cotización.
3. **Servicios y pago**: servicios adicionales (instalación, capacitación, mantenimiento) y forma de pago (contado con descuento o cuotas con recargo), definidos en `data/condiciones.json`.
4. **Cálculo**: subtotal, descuento por volumen, servicios, ajuste por forma de pago, IVA y total con valor de cuota.
5. **Confirmación**: se completan los datos de la institución, se revisa el detalle y se confirma. Se genera un número de cotización con fecha de vencimiento.
6. **Historial**: las cotizaciones confirmadas se guardan y se pueden ver, editar como nueva, eliminar o vaciar.

## Cómo ejecutarlo

El proyecto usa `fetch` para leer archivos JSON locales, por lo que **no funciona abriendo `index.html` con doble clic** (el navegador bloquea las peticiones con `file://`). Opciones:

- **GitHub Pages**: Settings → Pages → Branch `main` / root.
- **Live Server** (VS Code): clic derecho en `index.html` → *Open with Live Server*.
- **Python**: `python -m http.server` en la carpeta del proyecto y abrir `http://localhost:8000`.

## Estructura

```
index.html
css/styles.css
js/datos.js        → fetch de JSON y helpers de localStorage / sessionStorage
js/cotizacion.js   → estado, operaciones de la cotización, cálculos e historial
js/app.js          → renderizado del DOM, eventos y arranque
data/equipos.json
data/condiciones.json
assets/img/        → íconos SVG
```

## Tecnologías

- HTML, CSS propio, JavaScript (ES6+)
- [SweetAlert2](https://sweetalert2.github.io/) para confirmaciones y detalle
- [Toastify JS](https://apvarun.github.io/toastify-js/) para notificaciones

Los equipos, marcas y precios son ficticios.
