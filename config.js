/**
 * config.js — Configuración global de la aplicación.
 *
 * El clima usa Open-Meteo (https://open-meteo.com/en/docs):
 * API gratuita, de código abierto y SIN API KEY, así que la app
 * muestra clima real desde el primer momento.
 *
 * Endpoints:
 *  - Geocoding:    convierte "Bogotá" → lat/lon, país y zona horaria.
 *  - Forecast:     clima actual + por horas + diario (hasta 16 días).
 *  - Air Quality:  calidad del aire (índice europeo EAQI y contaminantes).
 */
"use strict";

const CONFIG = Object.freeze({
  OPEN_METEO_GEOCODING_URL: "https://geocoding-api.open-meteo.com/v1/search",
  OPEN_METEO_FORECAST_URL: "https://api.open-meteo.com/v1/forecast",
  OPEN_METEO_AIR_URL: "https://air-quality-api.open-meteo.com/v1/air-quality",
  CITY_KEY: "rutas-seguras-kids:ultima-ciudad",
});
