/**
 * config.js — Direcciones de la API del clima.
 *
 * Se usa Open-Meteo (https://open-meteo.com): es gratuita y NO necesita
 * API key, así que la app muestra clima real desde el primer momento.
 */
"use strict";

// Convierte un nombre de ciudad (ej: "Bogotá") en coordenadas.
const URL_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

// Da el clima actual, el pronóstico por horas y por días.
const URL_CLIMA = "https://api.open-meteo.com/v1/forecast";

// Da la calidad del aire (PM2.5, PM10, etc.).
const URL_AIRE = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Clave de LocalStorage donde se guarda la última ciudad consultada.
const CLAVE_ULTIMA_CIUDAD = "rutas-seguras-kids:ultima-ciudad";
