# 🚌 Rutas Seguras Kids – Sistema de Gestión de Rutas Escolares (v2)

Aplicación frontend profesional construida **exclusivamente con HTML5, CSS3 y JavaScript Vanilla (ES6+)** — sin frameworks ni librerías externas. Esta versión combina la arquitectura nueva con el **tema oscuro glass y la vista Clima** de la versión anterior, y entrega **todo en una sola carpeta**.

## Cómo ejecutar

1. Abre `index.html` directamente en el navegador, o sirve la carpeta con un servidor local.

La primera ejecución carga datos de ejemplo. Todo cambio se persiste en **LocalStorage** y sobrevive a recargas de página.

##  ================== CAPTURAS =================
## Panel de control
<img width="932" height="417" alt="image" src="https://github.com/user-attachments/assets/bcbdde70-aadf-4ff8-a2d0-b6163a4a99cd" />

## Rutas Escolares

<img width="947" height="419" alt="image" src="https://github.com/user-attachments/assets/3642824e-b9e2-4825-a19d-f2f3e5122d12" />

## ESTUDIANTES

<img width="944" height="402" alt="image" src="https://github.com/user-attachments/assets/73c974f6-03de-4c08-9a9e-0b7d02070c19" />

## CLIMA

<img width="949" height="401" alt="image" src="https://github.com/user-attachments/assets/736b12ee-899e-4cc4-8c01-8536a8283688" />




## Estructura (una sola carpeta)

```
/RUTAS-SEGURAS-KIDS
├── index.html        # Página única: 4 vistas (Dashboard/Rutas/Estudiantes/Clima), modales y templates
├── styles.css        # Hoja de estilos única: tema oscuro glass + responsive (3 breakpoints)
├── config.js         # Endpoints de Open-Meteo y constantes
├── custom-events.js  # Bus de Custom Events (routeCreated, routeUpdated, studentAssigned, clima:buscar…)
├── storage.js        # Capa LocalStorage + estado central + datos semilla
├── validation.js     # Validación declarativa en tiempo real
├── ui.js             # Toasts, modales accesibles, confirmaciones, helpers
├── api.js            # Open-Meteo: geocoding, clima actual, pronóstico 5 días y AQI
├── route-card.js     # Web Component <route-card> (Shadow DOM + template)
├── routes.js         # CRUD de rutas, filtros, orden, detalle con clima
├── students.js       # CRUD de estudiantes y asignación a rutas
├── weather.js        # Vista Clima: búsqueda, geolocalización, pronóstico, AQI
├── app.js            # Orquestador: navegación, dashboard, búsqueda global
├── logo.svg          # Logo
└── favicon.svg       # Favicon
```

## Vistas

- **📊 Panel de control** — estadísticas, rutas recientes y widget de clima con botón "Ver clima completo".
- **🚌 Rutas escolares** — CRUD completo con búsqueda, filtros por estado/ciudad, ordenamiento y modal de detalle (incluye clima de la ciudad y acceso a la vista Clima).
- **🎓 Estudiantes** — registro, edición, eliminación y asignación a rutas con validación de capacidad.
- **⛅ Clima** — weather app en tiempo real heredada de la versión anterior: búsqueda por ciudad, ubicación actual https://open-meteo.com/ (geolocalización), tarjeta "Ahora", pronóstico 5 días, hoy por horas, calidad del aire (AQI con PM2.5, PM10, SO₂, CO, NO, NO₂, NH₃, O₃), amanecer/atardecer, humedad, presión, visibilidad, viento y sensación térmica.

## Características técnicas demostradas

- **Web Components**: `class RouteCard extends HTMLElement` con Shadow DOM, `<template>` y estilos encapsulados.
- **Async/Await + Fetch API**: Open-Meteo (geocoding, clima, pronóstico y AQI en paralelo con `Promise.all`), `try/catch`, estados de carga, caché de 10 minutos y manejo de errores.
- **LocalStorage**: persistencia de rutas, estudiantes y última ciudad consultada.
- **DOM avanzado**: delegación de eventos, `DocumentFragment`, creación/eliminación dinámica de nodos, filtrado y ordenamiento de colecciones.
- **Búsqueda global en tiempo real** (atajo `/`) sobre rutas, conductores y estudiantes.
- **Validación profesional**: requeridos, longitudes, nombres, teléfonos, placas, duplicados y capacidad, con mensajes en vivo y `aria-invalid`.
- **Accesibilidad (WCAG)**: HTML semántico, `aria-label`, skip link, trampa de foco en modales, navegación por teclado, `prefers-reduced-motion`.
- **Responsive**: desktop ≥1200px, tablet 768–1199px, móvil ≤767px (sidebar deslizante).
- **UX moderna**: tema oscuro glass con degradado índigo→cian, modales, toasts, confirmaciones, indicadores de carga y estados vacíos.
