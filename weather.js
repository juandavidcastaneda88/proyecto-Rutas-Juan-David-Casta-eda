/**
 * weather.js — Vista "Clima".
 *
 * Permite buscar el clima por ciudad o por ubicación actual, y muestra:
 * el clima de ahora, el pronóstico de 5 días, las próximas horas y la
 * calidad del aire. Usa las funciones de api.js (fetch + async/await).
 */
"use strict";

// Clases de color para el nivel de calidad del aire (1 a 5).
const CLASES_AIRE = ["", "aqi--1", "aqi--2", "aqi--3", "aqi--4", "aqi--5"];

// Nombres bonitos de los contaminantes.
const NOMBRES_AIRE = {
  pm2_5: "PM2.5",
  pm10: "PM10",
  so2: "SO₂",
  co: "CO",
  no2: "NO₂",
  o3: "O₃",
};

/** Muestra u oculta el indicador de carga de la vista Clima. */
function ponerCargandoClima(activo) {
  document.getElementById("weather-loading").classList.toggle("hidden", !activo);
  document.getElementById("weather-layout").classList.toggle("weather-layout--dim", activo);
}

/* ===================== Pintar cada sección ===================== */

/** Pinta la tarjeta "Ahora" con el clima actual. */
function pintarAhora(clima) {
  document.getElementById("w-temp").textContent = clima.temp + "°C";

  const icono = document.getElementById("w-icon");
  icono.src = clima.icono;
  icono.alt = clima.descripcion;
  icono.hidden = false;

  document.getElementById("w-desc").textContent = clima.descripcion;
  document.getElementById("w-fecha").textContent = clima.fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let nombreLugar = clima.ciudad;
  if (clima.pais) nombreLugar += ", " + clima.pais;
  document.getElementById("w-ciudad").textContent = nombreLugar;

  document.getElementById("w-humedad").textContent = clima.humedad + "%";
  document.getElementById("w-presion").textContent = clima.presion + " hPa";
  document.getElementById("w-visibilidad").textContent = clima.visibilidad + " km";
  document.getElementById("w-viento").textContent = clima.viento + " m/s";
  document.getElementById("w-sensacion").textContent = clima.sensacion + "°C";
  document.getElementById("w-amanecer").textContent = clima.amanecer;
  document.getElementById("w-atardecer").textContent = clima.atardecer;
}

/** Pinta el pronóstico de 5 días y las próximas 8 horas. */
function pintarPronostico(pronostico) {
  // --- Próximos 5 días ---
  let htmlDias = "";
  for (const dia of pronostico.dias) {
    htmlDias += `
      <li>
        <div class="w-forecast__left">
          <img src="${dia.icono}" alt="${escaparHTML(dia.desc)}" title="${escaparHTML(dia.desc)}" />
          <strong>${dia.temp}°C</strong>
        </div>
        <span class="w-forecast__date">${dia.fecha}</span>
        <span class="w-forecast__day">${dia.dia}</span>
      </li>
    `;
  }
  document.getElementById("w-forecast").innerHTML = htmlDias;

  // --- Hoy por horas ---
  let htmlHoras = "";
  for (const hora of pronostico.horas) {
    htmlHoras += `
      <div class="w-hour">
        <span class="w-hour__time">${hora.hora}</span>
        <img src="${hora.icono}" alt="${escaparHTML(hora.desc)}" title="${escaparHTML(hora.desc)}" />
        <strong>${hora.temp}°</strong>
      </div>
    `;
  }
  document.getElementById("w-hourly").innerHTML = htmlHoras;
}

/** Pinta la calidad del aire (insignia + contaminantes). */
function pintarAire(aire) {
  const badge = document.getElementById("w-aqi-badge");
  const grid = document.getElementById("w-aqi-grid");

  if (aire.error) {
    badge.textContent = "—";
    badge.className = "aqi-badge";
    grid.innerHTML = "";
    return;
  }

  badge.textContent = ETIQUETAS_AIRE[aire.indice];
  badge.className = "aqi-badge " + CLASES_AIRE[aire.indice];

  let html = "";
  for (const clave in aire.componentes) {
    const valor = aire.componentes[clave];
    const texto = valor === null || valor === undefined ? "—" : valor;
    html += `
      <div class="aqi-cell">
        <small>${NOMBRES_AIRE[clave] || clave}</small>
        <strong>${texto}</strong>
      </div>
    `;
  }
  grid.innerHTML = html;
}

/* ===================== Carga del clima ===================== */

/**
 * Carga todo el clima de la vista. Acepta { q: "ciudad" } o { lat, lon }.
 */
async function cargarClima(opciones) {
  ponerCargandoClima(true);

  // 1. Clima actual.
  const clima = await obtenerClimaCompleto(opciones);
  if (clima.error) {
    ponerCargandoClima(false);
    mostrarToast(clima.error, "error");
    return;
  }
  pintarAhora(clima);

  // 2. Pronóstico (se arma con los datos que ya entregó la API).
  const pronostico = armarPronostico(clima.datosCompletos);
  pintarPronostico(pronostico);

  // 3. Calidad del aire.
  const aire = await obtenerCalidadAire(clima.coord.lat, clima.coord.lon);
  pintarAire(aire);

  ponerCargandoClima(false);

  // Recordar la ciudad para la próxima visita.
  document.getElementById("weather-city").value = clima.ciudad;
  localStorage.setItem(CLAVE_ULTIMA_CIUDAD, clima.ciudad);
}

/**
 * Abre la vista Clima mostrando una ciudad específica.
 * La usan el dashboard y el detalle de una ruta.
 */
function abrirVistaClimaConCiudad(ciudad) {
  cerrarTodosLosModales();
  mostrarVista("clima");
  document.getElementById("weather-city").value = ciudad;
  cargarClima({ q: ciudad });
}

/* ===================== Inicialización ===================== */

/** Conecta los eventos de la vista Clima (se llama una sola vez). */
function iniciarClima() {
  // Búsqueda por nombre de ciudad.
  document.getElementById("weather-form").addEventListener("submit", function (evento) {
    evento.preventDefault();
    const ciudad = document.getElementById("weather-city").value.trim();
    if (ciudad.length < 2) {
      mostrarToast("Escribe el nombre de una ciudad (mínimo 2 letras).", "warning");
      return;
    }
    cargarClima({ q: ciudad });
  });

  // Búsqueda por ubicación actual (geolocalización del navegador).
  document.getElementById("weather-location").addEventListener("click", function () {
    if (!navigator.geolocation) {
      mostrarToast("Tu navegador no soporta geolocalización.", "error");
      return;
    }
    ponerCargandoClima(true);
    navigator.geolocation.getCurrentPosition(
      function (posicion) {
        cargarClima({ lat: posicion.coords.latitude, lon: posicion.coords.longitude });
      },
      function () {
        mostrarToast("No se pudo obtener tu ubicación. Mostrando Bogotá.", "warning");
        cargarClima({ q: "Bogotá" });
      }
    );
  });

  // Carga inicial: la última ciudad consultada, o Bogotá.
  const ultimaCiudad = localStorage.getItem(CLAVE_ULTIMA_CIUDAD) || "Bogotá";
  cargarClima({ q: ultimaCiudad });
}
