/**
 * app.js — Punto de entrada de la aplicación.
 *
 * Se encarga de:
 *  - Cargar los datos guardados al abrir la página.
 *  - La navegación entre vistas (dashboard / rutas / estudiantes / clima).
 *  - El dashboard: contadores, rutas recientes y widget de clima.
 *  - La búsqueda global, el menú móvil y el cierre de modales.
 */
"use strict";

const CIUDAD_POR_DEFECTO = "Bogotá";

/* ==================== Navegación entre vistas ==================== */

/** Muestra una vista (dashboard, routes, students o clima) y oculta las demás. */
function mostrarVista(nombreVista) {
  const vistas = ["dashboard", "routes", "students", "clima"];

  for (const nombre of vistas) {
    const seccion = document.getElementById("view-" + nombre);
    seccion.hidden = nombre !== nombreVista;
  }

  // Marcar el enlace activo en el menú lateral (accesibilidad).
  const enlaces = document.querySelectorAll(".sidebar__link");
  enlaces.forEach(function (enlace) {
    if (enlace.dataset.view === nombreVista) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });

  cerrarMenuMovil();
}

/* ==================== Menú móvil ==================== */

function abrirMenuMovil() {
  document.getElementById("sidebar").classList.add("is-open");
  document.getElementById("sidebar-backdrop").hidden = false;
  document.getElementById("btn-menu").setAttribute("aria-expanded", "true");
}

function cerrarMenuMovil() {
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebar-backdrop").hidden = true;
  document.getElementById("btn-menu").setAttribute("aria-expanded", "false");
}

/* ==================== Dashboard ==================== */

/** Actualiza los 4 contadores de estadísticas. */
function pintarEstadisticas() {
  const rutasActivas = rutas.filter(function (ruta) {
    return ruta.active;
  });
  const estudiantesAsignados = estudiantes.filter(function (estudiante) {
    return estudiante.routeId !== "";
  });

  document.getElementById("stat-routes").textContent = rutas.length;
  document.getElementById("stat-active").textContent = rutasActivas.length;
  document.getElementById("stat-students").textContent = estudiantes.length;
  document.getElementById("stat-assigned").textContent = estudiantesAsignados.length;
}

/** Muestra las 4 rutas más recientes en el panel de control. */
function pintarRutasRecientes() {
  const contenedor = document.getElementById("recent-routes");

  // Copiar la lista y ordenarla de la más nueva a la más vieja.
  const recientes = [...rutas];
  recientes.sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  const primeras = recientes.slice(0, 4);

  if (primeras.length === 0) {
    contenedor.innerHTML = '<p class="u-text-muted u-text-sm">Aún no hay rutas registradas.</p>';
    return;
  }

  let html = "";
  for (const ruta of primeras) {
    const asignados = estudiantesDeRuta(ruta.id).length;
    html += `
      <button class="detail-students__item" type="button" onclick="verDetalleRuta('${ruta.id}')"
              style="width: 100%; border: none; cursor: pointer; text-align: left; font: inherit;"
              aria-label="Ver detalle de ${escaparHTML(ruta.name)}">
        <span>🚌 <strong>${escaparHTML(ruta.name)}</strong> · ${escaparHTML(ruta.driver)}</span>
        <span class="u-text-muted">${formatearHora(ruta.departureTime)} · ${asignados}/${ruta.capacity} 🎒</span>
      </button>
    `;
  }
  contenedor.innerHTML = html;
}

/** Pinta la tarjeta de clima del dashboard. */
async function pintarClimaDashboard(ciudad) {
  const tarjeta = document.getElementById("weather-card");
  mostrarCargando(tarjeta, "Consultando el clima de " + ciudad + "…");

  const clima = await obtenerClimaCompleto({ q: ciudad });
  if (clima.error) {
    tarjeta.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem;">
        <p class="empty-state__title">No fue posible obtener el clima</p>
        <p>${escaparHTML(clima.error)}.</p>
      </div>
    `;
    return;
  }

  tarjeta.innerHTML = `
    <div class="weather-card__main">
      <img src="${clima.icono}" alt="${escaparHTML(clima.descripcion)}" style="width: 72px; height: 72px;" />
      <div>
        <p class="weather-card__temp">${clima.temp}°C</p>
        <p class="weather-card__condition">${escaparHTML(clima.descripcion)} · ${escaparHTML(clima.ciudad)}</p>
      </div>
    </div>
    <div class="weather-card__details">
      <div class="weather-card__detail">
        <span class="weather-card__detail-label">Sensación térmica</span>
        <strong>${clima.sensacion}°C</strong>
      </div>
      <div class="weather-card__detail">
        <span class="weather-card__detail-label">Humedad</span>
        <strong>${clima.humedad}%</strong>
      </div>
      <div class="weather-card__detail">
        <span class="weather-card__detail-label">Viento</span>
        <strong>${clima.viento} m/s</strong>
      </div>
      <div class="weather-card__detail">
        <span class="weather-card__detail-label">Visibilidad</span>
        <strong>${clima.visibilidad} km</strong>
      </div>
    </div>
  `;
}

/** Actualiza el chip de clima de la barra superior. */
async function actualizarClimaTopbar(ciudad) {
  const chip = document.getElementById("topbar-weather");
  const clima = await obtenerClimaSimple(ciudad);

  if (clima.error) {
    chip.innerHTML = '<span aria-hidden="true">⚠️</span><span>Clima no disponible</span>';
    return;
  }
  chip.innerHTML = `
    <img src="${clima.icono}" alt="" style="width: 24px; height: 24px;" />
    <span>${clima.temp}°C · ${escaparHTML(ciudad)}</span>
  `;
}

/** Configura el selector de ciudad del widget de clima del dashboard. */
function iniciarWidgetClima() {
  const select = document.getElementById("weather-city-select");

  let html = "";
  for (const ciudad of CIUDADES) {
    html += `<option value="${ciudad}">${ciudad}</option>`;
  }
  select.innerHTML = html;
  select.value = CIUDAD_POR_DEFECTO;

  // Al cambiar la ciudad se actualizan la tarjeta y la barra superior.
  select.addEventListener("change", function () {
    pintarClimaDashboard(select.value);
    actualizarClimaTopbar(select.value);
  });

  // Botón "Ver clima completo": abre la vista Clima con la ciudad elegida.
  document.getElementById("btn-weather-full").addEventListener("click", function () {
    abrirVistaClimaConCiudad(select.value);
  });

  // El chip de la barra superior también lleva a la vista Clima.
  document.getElementById("topbar-weather").addEventListener("click", function () {
    mostrarVista("clima");
  });

  // Carga inicial.
  pintarClimaDashboard(CIUDAD_POR_DEFECTO);
  actualizarClimaTopbar(CIUDAD_POR_DEFECTO);
}

/* ==================== Búsqueda global ==================== */

/**
 * La búsqueda de la barra superior filtra rutas Y estudiantes a la vez.
 * Si el usuario está en el dashboard, lo lleva a la vista de rutas.
 */
function iniciarBusquedaGlobal() {
  const campo = document.getElementById("global-search");

  campo.addEventListener("input", function () {
    const texto = campo.value;

    // Pasar el texto a los buscadores de cada vista.
    filtroRutasTexto = texto;
    document.getElementById("search-routes").value = texto;
    pintarRutas();

    filtroEstudiantesTexto = texto;
    document.getElementById("search-students").value = texto;
    pintarEstudiantes();

    // Si está en el dashboard, mostrar la vista de rutas con los resultados.
    const enDashboard = !document.getElementById("view-dashboard").hidden;
    if (texto.trim() !== "" && enDashboard) {
      mostrarVista("routes");
    }
  });
}

/* ==================== Formularios ==================== */

/** Llena el <select> de ciudades del formulario de rutas. */
function llenarSelectCiudades() {
  const select = document.getElementById("route-city");

  let html = '<option value="">Selecciona una ciudad…</option>';
  for (const ciudad of CIUDADES) {
    html += `<option value="${ciudad}">${ciudad}</option>`;
  }
  select.innerHTML = html;
}

/* ==================== Eventos globales ==================== */

function iniciarEventosGlobales() {
  // Navegación del menú lateral.
  const enlaces = document.querySelectorAll(".sidebar__link");
  enlaces.forEach(function (enlace) {
    enlace.addEventListener("click", function () {
      mostrarVista(enlace.dataset.view);
    });
  });

  // Botones "Nueva ruta" y "Nuevo estudiante" (hay varios en la página).
  const botonesNuevaRuta = document.querySelectorAll('[data-action="new-route"]');
  botonesNuevaRuta.forEach(function (boton) {
    boton.addEventListener("click", function () {
      abrirFormularioRuta(null);
    });
  });

  const botonesNuevoEstudiante = document.querySelectorAll('[data-action="new-student"]');
  botonesNuevoEstudiante.forEach(function (boton) {
    boton.addEventListener("click", function () {
      abrirFormularioEstudiante(null);
    });
  });

  // Cerrar modales: clic en el fondo oscuro o en los botones de cerrar.
  const overlays = document.querySelectorAll(".modal-overlay");
  overlays.forEach(function (overlay) {
    overlay.addEventListener("click", function (evento) {
      const clicEnFondo = evento.target === overlay;
      const clicEnCerrar = evento.target.closest("[data-close-modal]");
      if (clicEnFondo || clicEnCerrar) {
        cerrarModal(overlay.id);
      }
    });
  });

  // Tecla Escape: cierra modales y el menú móvil.
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
      cerrarTodosLosModales();
      cerrarMenuMovil();
    }
  });

  // Menú móvil.
  document.getElementById("btn-menu").addEventListener("click", abrirMenuMovil);
  document.getElementById("sidebar-backdrop").addEventListener("click", cerrarMenuMovil);
}

/* ==================== Refresco general ==================== */

/**
 * Vuelve a pintar TODO lo que depende de los datos.
 * Se llama después de cualquier cambio (crear, editar, eliminar, asignar).
 */
function refrescarTodo() {
  pintarEstadisticas();
  pintarRutasRecientes();
  actualizarFiltroCiudades();
  pintarRutas();
  actualizarSelectsDeRutas();
  pintarEstudiantes();
}

/* ==================== Inicialización ==================== */

function iniciarApp() {
  // 1. Cargar los datos guardados (o crear los de ejemplo).
  cargarDatos();

  // 2. Llenar los selects y el widget de clima.
  llenarSelectCiudades();
  iniciarWidgetClima();

  // 3. Conectar los eventos de cada vista.
  iniciarRutas();
  iniciarEstudiantes();
  iniciarClima();
  iniciarEventosGlobales();
  iniciarBusquedaGlobal();

  // 4. Pintar todo y mostrar el dashboard.
  refrescarTodo();
  mostrarVista("dashboard");

  console.info("Rutas Seguras Kids inicializado correctamente.");
}

// Arranca la aplicación cuando el HTML termina de cargar.
document.addEventListener("DOMContentLoaded", iniciarApp);
