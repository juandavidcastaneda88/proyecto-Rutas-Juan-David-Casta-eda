/**
 * weather.js — Vista "Clima" (weather app en tiempo real).
 *
 * Heredada de la versión anterior del proyecto y adaptada a la
 * arquitectura nueva. Replica la experiencia de una plataforma de clima:
 *  - Búsqueda por ciudad y por ubicación actual (geolocalización).
 *  - "Ahora": temperatura, descripción, fecha y ciudad.
 *  - Pronóstico 5 días y "Hoy por horas" (API /forecast).
 *  - Destacados: calidad del aire (AQI), amanecer/atardecer,
 *    humedad, presión, visibilidad, viento y sensación térmica.
 *
 * Se comunica con el resto de la app mediante el CustomEvent
 * "clima:buscar" (lo disparan el dashboard y el detalle de una ruta).
 */
"use strict";

const WeatherView = (() => {
  const $ = (id) => document.getElementById(id);

  const AQI_CLASES = ["", "aqi--1", "aqi--2", "aqi--3", "aqi--4", "aqi--5"];
  const AQI_NOMBRES = {
    pm2_5: "PM2.5", pm10: "PM10", so2: "SO₂", co: "CO",
    no: "NO", no2: "NO₂", nh3: "NH₃", o3: "O₃",
  };

  function setCargando(activo) {
    $("weather-loading").classList.toggle("hidden", !activo);
    $("weather-layout").classList.toggle("weather-layout--dim", activo);
  }

  /* ===================== Render ===================== */

  function pintarAhora(c) {
    $("w-temp").textContent = `${c.temp}°C`;
    const icono = $("w-icon");
    icono.src = c.icono;
    icono.alt = c.descripcion;
    icono.hidden = false;
    $("w-desc").textContent = c.descripcion;
    $("w-fecha").textContent = c.fecha.toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    $("w-ciudad").textContent = `${c.ciudad}${c.pais && c.pais !== "—" ? ", " + c.pais : ""}`;

    $("w-humedad").textContent = `${c.humedad}%`;
    $("w-presion").textContent = `${c.presion} hPa`;
    $("w-visibilidad").textContent = `${c.visibilidad} km`;
    $("w-viento").textContent = `${c.viento} m/s`;
    $("w-sensacion").textContent = `${c.sensacion}°C`;
    $("w-amanecer").textContent = c.amanecer;
    $("w-atardecer").textContent = c.atardecer;
  }

  function pintarPronostico(p) {
    const lista = $("w-forecast");
    const horario = $("w-hourly");
    lista.innerHTML = "";
    horario.innerHTML = "";
    if (p.error) return;

    // Pronóstico 5 días (creación dinámica de nodos)
    p.dias.forEach((d) => {
      const li = document.createElement("li");

      const izq = document.createElement("div");
      izq.className = "w-forecast__left";
      const img = document.createElement("img");
      img.src = d.icono;
      img.alt = d.desc;
      img.title = d.desc;
      const temp = document.createElement("strong");
      temp.textContent = `${d.temp}°C`;
      izq.append(img, temp);

      const fecha = document.createElement("span");
      fecha.className = "w-forecast__date";
      fecha.textContent = d.fecha;

      const dia = document.createElement("span");
      dia.className = "w-forecast__day";
      dia.textContent = d.dia;

      li.append(izq, fecha, dia);
      lista.appendChild(li);
    });

    // Hoy por horas
    p.horas.forEach((h) => {
      const celda = document.createElement("div");
      celda.className = "w-hour";

      const hora = document.createElement("span");
      hora.className = "w-hour__time";
      hora.textContent = h.hora;

      const img = document.createElement("img");
      img.src = h.icono;
      img.alt = h.desc;
      img.title = h.desc;

      const temp = document.createElement("strong");
      temp.textContent = `${h.temp}°`;

      celda.append(hora, img, temp);
      horario.appendChild(celda);
    });
  }

  function pintarAire(a) {
    const badge = $("w-aqi-badge");
    const grid = $("w-aqi-grid");
    grid.innerHTML = "";
    if (a.error) {
      badge.textContent = "—";
      badge.className = "aqi-badge";
      return;
    }

    badge.textContent = AQI_ETIQUETAS[a.indice];
    badge.className = `aqi-badge ${AQI_CLASES[a.indice]}`;

    Object.entries(a.componentes).forEach(([clave, valor]) => {
      const celda = document.createElement("div");
      celda.className = "aqi-cell";

      const nombre = document.createElement("small");
      nombre.textContent = AQI_NOMBRES[clave] || clave;

      const cifra = document.createElement("strong");
      cifra.textContent = valor;

      celda.append(nombre, cifra);
      grid.appendChild(celda);
    });
  }

  /* ============ Carga (asincronía con async/await) ============ */

  async function cargarClima(opciones) {
    setCargando(true);

    const clima = await obtenerClimaCompleto(opciones);
    if (clima.error) {
      setCargando(false);
      UI.toast(clima.error, "error");
      return;
    }

    pintarAhora(clima);
    $("weather-demo-note").classList.toggle("hidden", !clima.demo);

    // Pronóstico y calidad del aire en paralelo (Promise.all)
    const [pronostico, aire] = await Promise.all([
      obtenerPronostico(clima.coord.lat, clima.coord.lon, clima.ciudad, clima.zonaHoraria),
      obtenerCalidadAire(clima.coord.lat, clima.coord.lon, clima.ciudad),
    ]);

    pintarPronostico(pronostico);
    pintarAire(aire);
    setCargando(false);

    $("weather-city").value = clima.ciudad;
    localStorage.setItem(CONFIG.CITY_KEY, clima.ciudad);
  }

  /* ===================== Eventos ===================== */

  function init() {
    $("weather-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const ciudad = $("weather-city").value.trim();
      if (ciudad.length < 2) {
        UI.toast("Escribe el nombre de una ciudad (mínimo 2 letras).", "warning");
        return;
      }
      cargarClima({ q: ciudad });
    });

    $("weather-location").addEventListener("click", () => {
      if (!navigator.geolocation) {
        UI.toast("Tu navegador no soporta geolocalización.", "error");
        return;
      }
      setCargando(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => cargarClima({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {
          UI.toast("No se pudo obtener tu ubicación. Mostrando Bogotá.", "warning");
          cargarClima({ q: "Bogotá" });
        },
        { timeout: 8000 }
      );
    });

    // CustomEvent: otras partes de la app piden el clima de una ciudad.
    AppEvents.on(AppEvents.EVENTS.WEATHER_SEARCH, (detail) => {
      $("weather-city").value = detail.ciudad;
      cargarClima({ q: detail.ciudad });
    });

    // Carga inicial: última ciudad consultada (persistida) o Bogotá.
    const ultima = localStorage.getItem(CONFIG.CITY_KEY) || "Bogotá";
    cargarClima({ q: ultima });
  }

  return { init, cargarClima };
})();
