/**
 * api.js — Conexión con la API del clima (Open-Meteo).
 *
 * Open-Meteo es gratuita y no necesita API key. Se usa fetch con
 * async/await para pedir los datos, y try/catch para manejar errores.
 *
 * La API entrega el estado del cielo como un código numérico (código WMO)
 * que aquí se traduce a una descripción en español y un icono.
 */
"use strict";

/* ----- Tabla de códigos del clima: código → [descripción, icono] ----- */
const CODIGOS_CLIMA = {
  0: ["cielo despejado", "01"],
  1: ["mayormente despejado", "02"],
  2: ["parcialmente nublado", "03"],
  3: ["nublado", "04"],
  45: ["niebla", "50"],
  48: ["niebla con escarcha", "50"],
  51: ["llovizna ligera", "09"],
  53: ["llovizna moderada", "09"],
  55: ["llovizna densa", "09"],
  61: ["lluvia ligera", "10"],
  63: ["lluvia moderada", "10"],
  65: ["lluvia fuerte", "10"],
  71: ["nevada ligera", "13"],
  73: ["nevada moderada", "13"],
  75: ["nevada fuerte", "13"],
  80: ["chubascos ligeros", "09"],
  81: ["chubascos moderados", "09"],
  82: ["chubascos violentos", "09"],
  95: ["tormenta eléctrica", "11"],
  96: ["tormenta con granizo ligero", "11"],
  99: ["tormenta con granizo fuerte", "11"],
};

/** Traduce un código del clima a descripción + nombre de icono. */
function interpretarCodigoClima(codigo, esDeDia) {
  const datos = CODIGOS_CLIMA[codigo] || ["desconocido", "03"];
  const sufijo = esDeDia ? "d" : "n"; // icono de día o de noche
  return { descripcion: datos[0], icono: datos[1] + sufijo };
}

/** Construye la URL de la imagen del icono del clima. */
function urlDelIcono(codigoIcono, grande) {
  const tamano = grande ? "@2x" : "";
  return "https://openweathermap.org/img/wn/" + codigoIcono + tamano + ".png";
}

/** Saca la hora "05:45" de una fecha tipo "2026-06-10T05:45". */
function extraerHora(fechaISO) {
  if (!fechaISO) return "";
  return fechaISO.slice(11, 16);
}

/* ============ GEOCODING: nombre de ciudad → coordenadas ============ */

async function obtenerCoordenadas(nombreCiudad) {
  const url =
    URL_GEOCODING +
    "?name=" + encodeURIComponent(nombreCiudad.trim()) +
    "&count=1&language=es&format=json";

  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  if (!datos.results || datos.results.length === 0) {
    return null; // No se encontró la ciudad.
  }

  const lugar = datos.results[0];
  return {
    lat: lugar.latitude,
    lon: lugar.longitude,
    ciudad: lugar.name,
    pais: lugar.country_code || "",
  };
}

/* ============ CLIMA ACTUAL ============ */

/**
 * Pide el clima completo. Acepta { q: "ciudad" } o { lat, lon }.
 * Devuelve un objeto con los datos, o { error: "mensaje" } si algo falla.
 */
async function obtenerClimaCompleto(opciones) {
  try {
    // 1. Conseguir las coordenadas del lugar.
    let lugar;
    if (opciones.q) {
      lugar = await obtenerCoordenadas(opciones.q);
      if (!lugar) {
        return { error: 'Ciudad "' + opciones.q + '" no encontrada' };
      }
    } else {
      lugar = { lat: opciones.lat, lon: opciones.lon, ciudad: "Tu ubicación", pais: "" };
    }

    // 2. Pedir el clima a la API.
    const url =
      URL_CLIMA +
      "?latitude=" + lugar.lat + "&longitude=" + lugar.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m" +
      "&hourly=temperature_2m,weather_code,visibility,is_day" +
      "&daily=weather_code,temperature_2m_max,sunrise,sunset" +
      "&wind_speed_unit=ms&timezone=auto&forecast_days=6";

    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    const actual = datos.current;

    // 3. Traducir el código del clima a texto e icono.
    const clima = interpretarCodigoClima(actual.weather_code, actual.is_day === 1);

    // 4. La visibilidad viene por horas: se busca la de la hora actual.
    const horaActual = actual.time.slice(0, 13) + ":00";
    let indiceHora = datos.hourly.time.indexOf(horaActual);
    if (indiceHora < 0) indiceHora = 0;
    const visibilidadMetros = datos.hourly.visibility[indiceHora];

    return {
      ciudad: lugar.ciudad,
      pais: lugar.pais,
      temp: Math.round(actual.temperature_2m),
      sensacion: Math.round(actual.apparent_temperature),
      descripcion: clima.descripcion,
      icono: urlDelIcono(clima.icono, true),
      humedad: actual.relative_humidity_2m,
      presion: Math.round(actual.surface_pressure),
      visibilidad: (visibilidadMetros / 1000).toFixed(1),
      viento: actual.wind_speed_10m,
      amanecer: extraerHora(datos.daily.sunrise[0]),
      atardecer: extraerHora(datos.daily.sunset[0]),
      coord: { lat: lugar.lat, lon: lugar.lon },
      fecha: new Date(),
      datosCompletos: datos, // Se reutilizan para el pronóstico.
    };
  } catch (error) {
    console.error("Error consultando el clima:", error);
    return { error: "No se pudo obtener el clima" };
  }
}

/**
 * Versión corta: solo temperatura, descripción e icono de una ciudad.
 * La usan el detalle de ruta y la barra superior.
 */
async function obtenerClimaSimple(ciudad) {
  const clima = await obtenerClimaCompleto({ q: ciudad });
  if (clima.error) return clima;

  return {
    temp: clima.temp,
    descripcion: clima.descripcion,
    icono: clima.icono.replace("@2x", ""),
  };
}

/* ============ PRONÓSTICO: próximos 5 días + próximas 8 horas ============ */

/**
 * Arma el pronóstico a partir de los datos que ya entregó la API
 * (van incluidos en la respuesta de obtenerClimaCompleto).
 */
function armarPronostico(datos) {
  // --- Próximas 8 horas ---
  const horaActual = datos.current.time.slice(0, 13) + ":00";
  let inicio = datos.hourly.time.indexOf(horaActual);
  if (inicio < 0) inicio = 0;

  const horas = [];
  for (let i = inicio; i < inicio + 8 && i < datos.hourly.time.length; i++) {
    const clima = interpretarCodigoClima(datos.hourly.weather_code[i], datos.hourly.is_day[i] === 1);
    horas.push({
      hora: extraerHora(datos.hourly.time[i]),
      temp: Math.round(datos.hourly.temperature_2m[i]),
      icono: urlDelIcono(clima.icono, false),
      desc: clima.descripcion,
    });
  }

  // --- Próximos 5 días (el día 0 es hoy, por eso se empieza en 1) ---
  const dias = [];
  for (let i = 1; i <= 5 && i < datos.daily.time.length; i++) {
    const clima = interpretarCodigoClima(datos.daily.weather_code[i], true);
    const fecha = new Date(datos.daily.time[i] + "T12:00:00");
    dias.push({
      dia: fecha.toLocaleDateString("es-CO", { weekday: "long" }),
      fecha: fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
      temp: Math.round(datos.daily.temperature_2m_max[i]),
      icono: urlDelIcono(clima.icono, false),
      desc: clima.descripcion,
    });
  }

  return { horas: horas, dias: dias };
}

/* ============ CALIDAD DEL AIRE ============ */

const ETIQUETAS_AIRE = ["", "Buena", "Aceptable", "Moderada", "Mala", "Muy mala"];

/** Convierte el índice europeo (0 a 100+) a una escala de 1 a 5. */
function nivelDeAire(indiceEuropeo) {
  if (indiceEuropeo === null || indiceEuropeo === undefined) return 0;
  if (indiceEuropeo <= 20) return 1;
  if (indiceEuropeo <= 40) return 2;
  if (indiceEuropeo <= 60) return 3;
  if (indiceEuropeo <= 80) return 4;
  return 5;
}

async function obtenerCalidadAire(lat, lon) {
  try {
    const url =
      URL_AIRE +
      "?latitude=" + lat + "&longitude=" + lon +
      "&current=european_aqi,pm2_5,pm10,sulphur_dioxide,carbon_monoxide,nitrogen_dioxide,ozone";

    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    const actual = datos.current;

    return {
      indice: nivelDeAire(actual.european_aqi),
      componentes: {
        pm2_5: actual.pm2_5,
        pm10: actual.pm10,
        so2: actual.sulphur_dioxide,
        co: actual.carbon_monoxide,
        no2: actual.nitrogen_dioxide,
        o3: actual.ozone,
      },
    };
  } catch (error) {
    console.error("Error consultando la calidad del aire:", error);
    return { error: "No se pudo obtener la calidad del aire" };
  }
}
