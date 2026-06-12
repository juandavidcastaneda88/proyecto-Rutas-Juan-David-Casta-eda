/**
 * app.js — Punto de entrada y orquestador de la aplicación.
 *
 * Responsabilidades:
 *  - Cargar el estado desde LocalStorage (con datos semilla la 1ª vez).
 *  - Navegación entre vistas (dashboard / rutas / estudiantes).
 *  - Búsqueda global en tiempo real (rutas, conductores y estudiantes).
 *  - Dashboard: contadores, rutas recientes y widget de clima.
 *  - Menú móvil, cierre de modales y atajos de teclado.
 */
"use strict";

const App = (() => {
  const DEFAULT_CITY = "Bogotá";

  /* ==================== Navegación entre vistas ==================== */

  /**
   * Muestra una vista y oculta las demás, actualizando el estado
   * aria-current de la navegación (accesibilidad).
   * @param {"dashboard"|"routes"|"students"} viewName
   */
  function showView(viewName) {
    const views = {
      dashboard: document.getElementById("view-dashboard"),
      routes: document.getElementById("view-routes"),
      students: document.getElementById("view-students"),
      clima: document.getElementById("view-clima"),
    };

    for (const [name, section] of Object.entries(views)) {
      section.hidden = name !== viewName;
    }

    document.querySelectorAll(".sidebar__link").forEach((link) => {
      if (link.dataset.view === viewName) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    closeMobileMenu();
  }

  /* ==================== Menú móvil ==================== */

  function openMobileMenu() {
    document.getElementById("sidebar").classList.add("is-open");
    document.getElementById("sidebar-backdrop").hidden = false;
    document.getElementById("btn-menu").setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    document.getElementById("sidebar").classList.remove("is-open");
    document.getElementById("sidebar-backdrop").hidden = true;
    document.getElementById("btn-menu").setAttribute("aria-expanded", "false");
  }

  /* ==================== Dashboard ==================== */

  /** Actualiza los contadores de estadísticas. */
  function renderStats() {
    const routes = AppState.routes;
    const students = AppState.students;

    document.getElementById("stat-routes").textContent = routes.length;
    document.getElementById("stat-active").textContent = routes.filter((r) => r.active).length;
    document.getElementById("stat-students").textContent = students.length;
    document.getElementById("stat-assigned").textContent = students.filter(
      (s) => s.routeId
    ).length;
  }

  /** Lista las 4 rutas más recientes en el panel de control. */
  function renderRecentRoutes() {
    const container = document.getElementById("recent-routes");
    const recent = [...AppState.routes]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 4);

    if (!recent.length) {
      container.innerHTML = '<p class="u-text-muted u-text-sm">Aún no hay rutas registradas.</p>';
      return;
    }

    container.innerHTML = recent
      .map((route) => {
        const count = RoutesModule.studentsOfRoute(route.id).length;
        return `
          <button class="detail-students__item" type="button" data-open-route="${route.id}"
                  style="width: 100%; border: none; cursor: pointer; text-align: left; font: inherit;"
                  aria-label="Ver detalle de ${UI.escapeHTML(route.name)}">
            <span>🚌 <strong>${UI.escapeHTML(route.name)}</strong> · ${UI.escapeHTML(route.driver)}</span>
            <span class="u-text-muted">${UI.formatTime(route.departureTime)} · ${count}/${route.capacity} 🎒</span>
          </button>
        `;
      })
      .join("");
  }

  /**
   * Renderiza la tarjeta de clima del dashboard usando la capa api.js
   * (fetch + async/await contra Open-Meteo, sin API key).
   */
  async function renderDashboardWeather(city) {
    const card = document.getElementById("weather-card");
    UI.renderLoading(card, `Consultando el clima de ${city}…`);

    const clima = await obtenerClimaCompleto({ q: city });
    if (clima.error) {
      card.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem;">
          <p class="empty-state__title">No fue posible obtener el clima</p>
          <p>${UI.escapeHTML(clima.error)}.</p>
        </div>
      `;
      return;
    }

    const demoBadge = ""; // Open-Meteo no requiere API key: siempre datos reales.

    card.innerHTML = `
      <div class="weather-card__main">
        <img src="${clima.icono}" alt="${UI.escapeHTML(clima.descripcion)}" style="width: 72px; height: 72px;" />
        <div>
          <p class="weather-card__temp">${clima.temp}°C</p>
          <p class="weather-card__condition">${UI.escapeHTML(clima.descripcion)} · ${UI.escapeHTML(clima.ciudad)}</p>
        </div>
        ${demoBadge}
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
  async function updateTopbarWeather(city) {
    const chip = document.getElementById("topbar-weather");
    const clima = await obtenerClimaCompleto({ q: city });

    if (clima.error) {
      chip.innerHTML = `<span aria-hidden="true">⚠️</span><span>Clima no disponible</span>`;
      return;
    }
    chip.innerHTML = `
      <img src="${clima.icono.replace("@2x", "")}" alt="" style="width: 24px; height: 24px;" />
      <span>${clima.temp}°C · ${UI.escapeHTML(clima.ciudad)}</span>
    `;
  }

  /** Configura el selector de ciudad del widget de clima del dashboard. */
  function initWeatherWidget() {
    const select = document.getElementById("weather-city-select");
    select.innerHTML = "";

    for (const city of StorageService.CITIES) {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    }
    select.value = DEFAULT_CITY;

    select.addEventListener("change", () => {
      renderDashboardWeather(select.value);
      updateTopbarWeather(select.value);
    });

    // Botón "Ver clima completo": abre la vista Clima con la ciudad elegida.
    document.getElementById("btn-weather-full").addEventListener("click", () => {
      showView("clima");
      AppEvents.emit(AppEvents.EVENTS.WEATHER_SEARCH, { ciudad: select.value });
    });

    // El chip de la topbar también lleva a la vista Clima.
    document.getElementById("topbar-weather").addEventListener("click", () => {
      showView("clima");
    });

    // Carga inicial del clima.
    renderDashboardWeather(DEFAULT_CITY);
    updateTopbarWeather(DEFAULT_CITY);
  }

  /* ==================== Búsqueda global ==================== */

  /**
   * La búsqueda global filtra rutas Y estudiantes en tiempo real.
   * Si el usuario está en el dashboard, lo lleva a la vista de rutas
   * para que vea los resultados inmediatamente.
   */
  function initGlobalSearch() {
    const input = document.getElementById("global-search");

    input.addEventListener(
      "input",
      UI.debounce(() => {
        const term = input.value;
        RoutesModule.setSearch(term);
        StudentsModule.setSearch(term);

        const dashboardVisible = !document.getElementById("view-dashboard").hidden;
        if (term.trim() && dashboardVisible) showView("routes");
      })
    );

    // Atajo de teclado "/" para enfocar la búsqueda (UX de SaaS moderno).
    document.addEventListener("keydown", (event) => {
      const typingInField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (event.key === "/" && !typingInField) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  /* ==================== Formularios de ciudad ==================== */

  /** Llena el <select> de ciudades del formulario de rutas. */
  function initCityOptions() {
    const select = document.getElementById("route-city");
    select.innerHTML = '<option value="">Selecciona una ciudad…</option>';

    for (const city of StorageService.CITIES) {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    }
  }

  /* ==================== Eventos globales de UI ==================== */

  function initGlobalListeners() {
    /* Navegación del sidebar (delegación de eventos). */
    document.querySelector(".sidebar__nav").addEventListener("click", (event) => {
      const link = event.target.closest("[data-view]");
      if (link) showView(link.dataset.view);
    });

    /* Botones "Nueva ruta" / "Nuevo estudiante" en cualquier vista. */
    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="new-route"]')) RoutesModule.openForm();
      if (event.target.closest('[data-action="new-student"]')) StudentsModule.openForm();
    });

    /* Apertura del detalle desde "Rutas recientes" (delegación). */
    document.getElementById("recent-routes").addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-route]");
      if (button) RoutesModule.openDetail(button.dataset.openRoute);
    });

    /* Cerrar modales: botones con data-close-modal y clic en el fondo. */
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (event) => {
        // El diálogo de confirmación exige una decisión explícita
        // (sus botones gestionan el cierre y resuelven la Promesa).
        if (overlay.id === "modal-confirm") return;
        if (event.target === overlay || event.target.closest("[data-close-modal]")) {
          UI.closeModal(overlay.id);
        }
      });
    });

    /* Tecla Escape: cierra modales y el menú móvil (accesibilidad). */
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        UI.closeAllModals();
        closeMobileMenu();
      }
    });

    /* Menú móvil. */
    document.getElementById("btn-menu").addEventListener("click", openMobileMenu);
    document.getElementById("sidebar-backdrop").addEventListener("click", closeMobileMenu);

    /* El dashboard reacciona automáticamente a CUALQUIER cambio de datos. */
    AppEvents.on(AppEvents.EVENTS.DATA_CHANGED, () => {
      renderStats();
      renderRecentRoutes();
    });
  }

  /* ==================== Inicialización ==================== */

  function init() {
    // 1. Persistencia: datos semilla (solo 1ª vez) + carga del estado.
    StorageService.seedIfEmpty();
    AppState.routes = StorageService.loadRoutes();
    AppState.students = StorageService.loadStudents();

    // 2. Opciones de formularios y widgets.
    initCityOptions();
    initWeatherWidget();

    // 3. Módulos de dominio.
    RoutesModule.init();
    StudentsModule.init();
    WeatherView.init();

    // 4. UI global.
    initGlobalListeners();
    initGlobalSearch();
    renderStats();
    renderRecentRoutes();
    showView("dashboard");

    console.info("Rutas Seguras Kids inicializado correctamente.");
  }

  return { init, showView };
})();

/* Arranque de la aplicación cuando el DOM está listo. */
document.addEventListener("DOMContentLoaded", App.init);
