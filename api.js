/**
 * api.js — Consumo de la API pública y gratuita de Open-Meteo.
 * Documentación: https://open-meteo.com/en/docs
 *
 * Open-Meteo NO requiere API key, por lo que la app siempre muestra
 * clima real. Endpoints usados (fetch + async/await):
 *  - Geocoding       → nombre de ciudad a coordenadas (lat/lon, país)
 *  - /v1/forecast    → clima actual + pronóstico por horas y diario
 *  - /v1/air-quality → calidad del aire (índice europeo EAQI)
 *
 * El estado del cielo llega como código WMO (weather_code) y aquí se
 * traduce a descripción en español + icono.
 */
"use strict";

/** Caché simple en memoria (10 min) para no repetir peticiones. */
const weatherCache = new Map();

function cacheGet(clave) {
  const c = weatherCache.get(clave);
  return c && Date.now() - c.t < 10 * 60 * 1000 ? c.v : null;
}

function cacheSet(clave, valor) {
  weatherCache.set(clave, { v: valor, t: Date.now() });
}

async function fetchJSON(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    const err = new Error(`HTTP ${respuesta.status}`);
    err.status = respuesta.status;
    throw err;
  }
  return respuesta.json();
}

// ============================================================
//  CÓDIGOS WMO → descripción en español + icono
//  (tabla "WMO Weather interpretation codes" de la documentación)
// ============================================================

const WMO = {
  0: ["cielo despejado", "01"],
  1: ["mayormente despejado", "02"],
  2: ["parcialmente nublado", "03"],
  3: ["nublado", "04"],
  45: ["niebla", "50"],
  48: ["niebla con escarcha", "50"],
  51: ["llovizna ligera", "09"],
  53: ["llovizna moderada", "09"],
  55: ["llovizna densa", "09"],
  56: ["llovizna helada ligera", "09"],
  57: ["llovizna helada densa", "09"],
  61: ["lluvia ligera", "10"],
  63: ["lluvia moderada", "10"],
  65: ["lluvia fuerte", "10"],
  66: ["lluvia helada ligera", "13"],
  67: ["lluvia helada fuerte", "13"],
  71: ["nevada ligera", "13"],
  73: ["nevada moderada", "13"],
  75: ["nevada fuerte", "13"],
  77: ["granos de nieve", "13"],
  80: ["chubascos ligeros", "09"],
  81: ["chubascos moderados", "09"],
  82: ["chubascos violentos", "09"],
  85: ["chubascos de nieve ligeros", "13"],
  86: ["chubascos de nieve fuertes", "13"],
  95: ["tormenta eléctrica", "11"],
  96: ["tormenta con granizo ligero", "11"],
  99: ["tormenta con granizo fuerte", "11"],
};

function interpretarWMO(codigo, esDia = true) {
  const [descripcion, icono] = WMO[codigo] || ["desconocido", "03"];
  return { descripcion, icono: `${icono}${esDia ? "d" : "n"}` };
}

const iconoURL = (codigo, grande = false) =>
  `https://openweathermap.org/img/wn/${codigo}${grande ? "@2x" : ""}.png`;

/** "2026-06-10T05:45" (hora local de la ciudad) → "05:45" */
const horaISO = (iso) => (iso || "").slice(11, 16);

// ============================================================
//  GEOCODING — nombre de ciudad → coordenadas
// ============================================================

async function geocodificarCiudad(nombre) {
  const url =
    `${CONFIG.OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(nombre.trim())}` +
    `&count=1&language=es&format=json`;
  const d = await fetchJSON(url);
  if (!d.results || !d.results.length) {
    const err = new Error("Ciudad no encontrada");
    err.status = 404;
    throw err;
  }
  const r = d.results[0];
  return { lat: r.latitude, lon: r.longitude, ciudad: r.name, pais: r.country_code || "" };
}

// ============================================================
//  FORECAST — una sola petición da clima actual + horas + días
// ============================================================

async function obtenerForecast(lat, lon) {
  const clave = `f:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cacheado = cacheGet(clave);
  if (cacheado) return cacheado;

  const url =
    `${CONFIG.OPEN_METEO_FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,visibility,is_day` +
    `&daily=weather_code,temperature_2m_max,sunrise,sunset` +
    `&wind_speed_unit=ms&timezone=auto&forecast_days=6`;

  const d = await fetchJSON(url);
  cacheSet(clave, d);
  return d;
}

// ============================================================
//  CLIMA ACTUAL
// ============================================================

/**
 * Clima actual completo. Acepta { q: "ciudad" } o { lat, lon }.
 * @returns {Promise<object>} datos del clima o { error }
 */
async function obtenerClimaCompleto({ q, lat, lon }) {
  try {
    let lugar;
    if (q) {
      const claveGeo = `g:${q.trim().toLowerCase()}`;
      lugar = cacheGet(claveGeo);
      if (!lugar) {
        lugar = await geocodificarCiudad(q);
        cacheSet(claveGeo, lugar);
      }
    } else {
      lugar = { lat, lon, ciudad: "Tu ubicación", pais: "" };
    }

    const d = await obtenerForecast(lugar.lat, lugar.lon);
    const c = d.current;
    const { descripcion, icono } = interpretarWMO(c.weather_code, c.is_day === 1);

    // Visibilidad: es una variable horaria; se toma la hora actual.
    const idxHora = Math.max(0, d.hourly.time.indexOf(c.time.slice(0, 13) + ":00"));
    const visibilidadM = d.hourly.visibility ? d.hourly.visibility[idxHora] : null;

    return {
      demo: false,
      ciudad: lugar.ciudad,
      pais: lugar.pais,
      temp: Math.round(c.temperature_2m),
      sensacion: Math.round(c.apparent_temperature),
      descripcion,
      icono: iconoURL(icono, true),
      humedad: c.relative_humidity_2m,
      presion: Math.round(c.surface_pressure),
      visibilidad: visibilidadM != null ? (visibilidadM / 1000).toFixed(1) : "—",
      viento: c.wind_speed_10m,
      amanecer: horaISO(d.daily.sunrise[0]),
      atardecer: horaISO(d.daily.sunset[0]),
      zonaHoraria: d.utc_offset_seconds,
      coord: { lat: lugar.lat, lon: lugar.lon },
      fecha: new Date(),
    };
  } catch (error) {
    console.error("Error consultando Open-Meteo:", error);
    if (error.status === 404) return { error: `Ciudad "${q}" no encontrada` };
    return { error: "No se pudo obtener el clima" };
  }
}

/**
 * Versión simple usada por <route-card>.
 * @returns {Promise<{temp:number, descripcion:string, icono:string}|{error:string}>}
 */
async function obtenerClima(ciudad) {
  const c = await obtenerClimaCompleto({ q: ciudad });
  if (c.error) return c;
  return {
    temp: c.temp,
    descripcion: c.descripcion,
    icono: c.icono.replace("@2x", ""),
  };
}

// ============================================================
//  PRONÓSTICO — 5 días + próximas 8 horas
// ============================================================

async function obtenerPronostico(lat, lon, ciudad, tzSegundos = 0) {
  try {
    const d = await obtenerForecast(lat, lon); // reutiliza la caché

    // --- Próximas 8 horas ("Hoy por horas") ---
    const inicio = Math.max(0, d.hourly.time.indexOf(d.current.time.slice(0, 13) + ":00"));
    const horas = d.hourly.time.slice(inicio, inicio + 8).map((t, i) => {
      const idx = inicio + i;
      const { descripcion, icono } = interpretarWMO(
        d.hourly.weather_code[idx],
        d.hourly.is_day ? d.hourly.is_day[idx] === 1 : true
      );
      return {
        hora: horaISO(t),
        temp: Math.round(d.hourly.temperature_2m[idx]),
        icono: iconoURL(icono),
        desc: descripcion,
      };
    });

    // --- Próximos 5 días (el índice 0 es hoy, se omite) ---
    const dias = d.daily.time.slice(1, 6).map((f, i) => {
      const { descripcion, icono } = interpretarWMO(d.daily.weather_code[i + 1]);
      const fechaObj = new Date(`${f}T12:00:00`);
      return {
        dia: fechaObj.toLocaleDateString("es-CO", { weekday: "long" }),
        fecha: fechaObj.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
        temp: Math.round(d.daily.temperature_2m_max[i + 1]),
        icono: iconoURL(icono),
        desc: descripcion,
      };
    });

    return { demo: false, horas, dias };
  } catch (error) {
    console.error("Error consultando el pronóstico:", error);
    return { error: "No se pudo obtener el pronóstico" };
  }
}

// ============================================================
//  CALIDAD DEL AIRE (EAQI — índice europeo de Open-Meteo)
// ============================================================

const AQI_ETIQUETAS = ["", "Buena", "Aceptable", "Moderada", "Mala", "Muy mala"];

/** Convierte el índice europeo (0–100+) a la escala 1–5 de la app. */
function eaqiANivel(eaqi) {
  if (eaqi == null) return 0;
  if (eaqi <= 20) return 1;
  if (eaqi <= 40) return 2;
  if (eaqi <= 60) return 3;
  if (eaqi <= 80) return 4;
  return 5;
}

async function obtenerCalidadAire(lat, lon, ciudad) {
  const clave = `a:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cacheado = cacheGet(clave);
  if (cacheado) return cacheado;

  const url =
    `${CONFIG.OPEN_METEO_AIR_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10,sulphur_dioxide,carbon_monoxide,nitrogen_dioxide,ozone`;

  try {
    const d = await fetchJSON(url);
    const c = d.current;
    const num = (v, dec = 1) => (v == null ? "—" : v.toFixed(dec));
    const resultado = {
      demo: false,
      indice: eaqiANivel(c.european_aqi),
      componentes: {
        pm2_5: num(c.pm2_5),
        pm10: num(c.pm10),
        so2: num(c.sulphur_dioxide),
        co: num(c.carbon_monoxide, 0),
        no2: num(c.nitrogen_dioxide),
        o3: num(c.ozone),
      },
    };
    cacheSet(clave, resultado);
    return resultado;
  } catch (error) {
    console.error("Error consultando calidad del aire:", error);
    return { error: "No se pudo obtener la calidad del aire" };
  }
}
