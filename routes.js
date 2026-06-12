/**
 * routes.js — Módulo de gestión de rutas escolares (CRUD completo).
 *
 * Responsabilidades:
 *  - Crear, editar, eliminar, buscar, filtrar y ordenar rutas.
 *  - Renderizar las tarjetas con el Web Component <route-card>.
 *  - Modal de detalle con estudiantes asignados y clima de la ciudad.
 *  - Emitir los Custom Events routeCreated / routeUpdated / routeDeleted.
 *
 * Todas las operaciones actualizan el DOM dinámicamente, sin recargar.
 */
"use strict";

const RoutesModule = (() => {
  /** Filtros activos de la vista de rutas. */
  const filters = {
    search: "",
    status: "all",
    city: "all",
    sort: "name",
  };

  /** Id de la ruta mostrada actualmente en el modal de detalle. */
  let detailRouteId = null;

  /* ==================== Consultas sobre el estado ==================== */

  /** Devuelve los estudiantes asignados a una ruta. */
  function studentsOfRoute(routeId) {
    return AppState.students.filter((student) => student.routeId === routeId);
  }

  /** Busca una ruta por id. */
  function findRoute(routeId) {
    return AppState.routes.find((route) => route.id === routeId) || null;
  }

  /** Cupos libres de una ruta. */
  function availableSeats(route) {
    return route.capacity - studentsOfRoute(route.id).length;
  }

  /**
   * Aplica búsqueda, filtros y ordenamiento sobre la colección de rutas.
   * Demuestra filtrado y ordenamiento de colecciones con métodos de Array.
   */
  function getVisibleRoutes() {
    const term = filters.search.trim().toLowerCase();

    const filtered = AppState.routes.filter((route) => {
      const matchesSearch =
        !term ||
        route.name.toLowerCase().includes(term) ||
        route.driver.toLowerCase().includes(term) ||
        route.plate.toLowerCase().includes(term) ||
        route.city.toLowerCase().includes(term);

      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" && route.active) ||
        (filters.status === "inactive" && !route.active);

      const matchesCity = filters.city === "all" || route.city === filters.city;

      return matchesSearch && matchesStatus && matchesCity;
    });

    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, "es"),
      time: (a, b) => a.departureTime.localeCompare(b.departureTime),
      capacity: (a, b) => b.capacity - a.capacity,
      occupancy: (a, b) =>
        studentsOfRoute(b.id).length / b.capacity - studentsOfRoute(a.id).length / a.capacity,
    };

    return [...filtered].sort(sorters[filters.sort] || sorters.name);
  }

  /* ==================== Renderizado ==================== */

  /**
   * Renderiza el grid de rutas usando el Web Component <route-card>.
   * Creación dinámica de nodos + eliminación de los anteriores.
   */
  function render() {
    const container = document.getElementById("routes-container");
    const emptyState = document.getElementById("routes-empty");
    const visibleRoutes = getVisibleRoutes();

    container.innerHTML = "";

    // Fragment para insertar todas las tarjetas en una sola operación.
    const fragment = document.createDocumentFragment();
    for (const route of visibleRoutes) {
      const card = document.createElement("route-card");
      card.dataset.id = route.id;
      card.route = route;
      card.studentsCount = studentsOfRoute(route.id).length;
      fragment.appendChild(card);
    }
    container.appendChild(fragment);

    emptyState.hidden = visibleRoutes.length > 0;
    container.hidden = visibleRoutes.length === 0;
  }

  /** Rellena el filtro de ciudades según las ciudades disponibles. */
  function refreshCityFilter() {
    const select = document.getElementById("filter-city");
    const current = select.value || "all";
    const cities = [...new Set(AppState.routes.map((route) => route.city))].sort((a, b) =>
      a.localeCompare(b, "es")
    );

    select.innerHTML = '<option value="all">Todas</option>';
    for (const city of cities) {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    }
    select.value = cities.includes(current) ? current : "all";
  }

  /* ==================== Formulario (crear / editar) ==================== */

  /**
   * Abre el modal de ruta. Si recibe un id, carga los datos para edición.
   * @param {string|null} routeId
   */
  function openForm(routeId = null) {
    const form = document.getElementById("form-route");
    const title = document.getElementById("modal-route-title");
    const submitBtn = document.getElementById("route-submit");

    form.reset();
    Validation.resetFormState(form);

    if (routeId) {
      const route = findRoute(routeId);
      if (!route) return;

      title.textContent = "Editar ruta";
      submitBtn.textContent = "Actualizar ruta";
      form.elements.id.value = route.id;
      form.elements.name.value = route.name;
      form.elements.driver.value = route.driver;
      form.elements.plate.value = route.plate;
      form.elements.departureTime.value = route.departureTime;
      form.elements.city.value = route.city;
      form.elements.capacity.value = route.capacity;
      form.elements.active.checked = route.active;
    } else {
      title.textContent = "Nueva ruta";
      submitBtn.textContent = "Guardar ruta";
      form.elements.id.value = "";
      form.elements.active.checked = true;
    }

    UI.openModal("modal-route");
  }

  /**
   * Valida y persiste el formulario de ruta.
   * Incluye detección de duplicados (nombre y placa) y validación de
   * capacidad contra los estudiantes ya asignados.
   */
  function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;

    // 1. Validación de campos (reglas declarativas).
    if (!Validation.validateForm(form, "route")) {
      UI.toast("Revisa los campos marcados en rojo.", "warning");
      return;
    }

    const editingId = form.elements.id.value || null;
    const data = {
      name: form.elements.name.value.trim(),
      driver: form.elements.driver.value.trim(),
      plate: form.elements.plate.value.trim().toUpperCase(),
      departureTime: form.elements.departureTime.value,
      city: form.elements.city.value,
      capacity: Number(form.elements.capacity.value),
      active: form.elements.active.checked,
    };

    // 2. Detección de duplicados (excluyendo la ruta en edición).
    const duplicateName = AppState.routes.some(
      (route) => route.id !== editingId && route.name.toLowerCase() === data.name.toLowerCase()
    );
    if (duplicateName) {
      Validation.showFieldError(form, "name", "Ya existe una ruta con este nombre.");
      return;
    }

    const duplicatePlate = AppState.routes.some(
      (route) => route.id !== editingId && route.plate.toUpperCase() === data.plate
    );
    if (duplicatePlate) {
      Validation.showFieldError(form, "plate", "Esta placa ya está registrada en otra ruta.");
      return;
    }

    // 3. Validación de capacidad: no puede ser menor que los asignados.
    if (editingId) {
      const assigned = studentsOfRoute(editingId).length;
      if (data.capacity < assigned) {
        Validation.showFieldError(
          form,
          "capacity",
          `La ruta ya tiene ${assigned} estudiantes asignados. La capacidad no puede ser menor.`
        );
        return;
      }
    }

    // 4. Persistencia + Custom Events.
    if (editingId) {
      const route = findRoute(editingId);
      Object.assign(route, data);
      StorageService.saveRoutes(AppState.routes);
      AppEvents.emit(AppEvents.EVENTS.ROUTE_UPDATED, { route });
      UI.toast(`Ruta "${route.name}" actualizada correctamente.`, "success");
    } else {
      const route = { id: StorageService.generateId(), createdAt: Date.now(), ...data };
      AppState.routes.push(route);
      StorageService.saveRoutes(AppState.routes);
      AppEvents.emit(AppEvents.EVENTS.ROUTE_CREATED, { route });
      UI.toast(`Ruta "${route.name}" creada correctamente.`, "success");
    }

    UI.closeModal("modal-route");
  }

  /* ==================== Eliminación ==================== */

  /**
   * Elimina una ruta previa confirmación. Los estudiantes asignados
   * quedan "sin asignar" (no se eliminan).
   */
  async function removeRoute(routeId) {
    const route = findRoute(routeId);
    if (!route) return;

    const assignedCount = studentsOfRoute(routeId).length;
    const message =
      assignedCount > 0
        ? `La ruta "${route.name}" tiene ${assignedCount} estudiante(s) asignado(s). Quedarán sin ruta. Esta acción no se puede deshacer.`
        : `Se eliminará la ruta "${route.name}". Esta acción no se puede deshacer.`;

    const confirmed = await UI.confirmDialog("Eliminar ruta", message);
    if (!confirmed) return;

    // Desasignar estudiantes de la ruta eliminada.
    for (const student of AppState.students) {
      if (student.routeId === routeId) student.routeId = "";
    }
    StorageService.saveStudents(AppState.students);

    AppState.routes = AppState.routes.filter((item) => item.id !== routeId);
    StorageService.saveRoutes(AppState.routes);

    AppEvents.emit(AppEvents.EVENTS.ROUTE_DELETED, { route });
    UI.toast(`Ruta "${route.name}" eliminada.`, "info");
  }

  /* ==================== Detalle de ruta ==================== */

  /** Abre el modal de detalle con datos, estudiantes y clima de la ciudad. */
  function openDetail(routeId) {
    const route = findRoute(routeId);
    if (!route) return;

    detailRouteId = routeId;
    const body = document.getElementById("detail-body");
    const students = studentsOfRoute(routeId);

    const studentsHTML = students.length
      ? students
          .map(
            (student) => `
              <li class="detail-students__item">
                <span>🎒 ${UI.escapeHTML(student.fullName)} · ${UI.escapeHTML(student.grade)}</span>
                <button class="btn btn--ghost" type="button" data-unassign="${student.id}" title="Quitar de la ruta">
                  Quitar ✕
                </button>
              </li>`
          )
          .join("")
      : '<li class="detail-students__item"><span>Sin estudiantes asignados todavía.</span></li>';

    body.innerHTML = `
      <dl class="detail-grid">
        <div><dt>Nombre de la ruta</dt><dd>${UI.escapeHTML(route.name)}</dd></div>
        <div><dt>Estado</dt><dd>${
          route.active
            ? '<span class="badge badge--success">Activa</span>'
            : '<span class="badge badge--danger">Inactiva</span>'
        }</dd></div>
        <div><dt>Conductor</dt><dd>${UI.escapeHTML(route.driver)}</dd></div>
        <div><dt>Placa del vehículo</dt><dd>${UI.escapeHTML(route.plate)}</dd></div>
        <div><dt>Hora de salida</dt><dd>${UI.formatTime(route.departureTime)}</dd></div>
        <div><dt>Ciudad</dt><dd>${UI.escapeHTML(route.city)}</dd></div>
        <div><dt>Capacidad</dt><dd>${route.capacity} puestos</dd></div>
        <div><dt>Cupos disponibles</dt><dd>${availableSeats(route)} puestos</dd></div>
      </dl>

      <h3 class="u-text-sm u-text-muted u-mb-4" style="text-transform: uppercase; letter-spacing: 0.04em;">
        Estudiantes asignados (${students.length})
      </h3>
      <ul class="detail-students u-mb-4">${studentsHTML}</ul>

      <h3 class="u-text-sm u-text-muted u-mb-4" style="text-transform: uppercase; letter-spacing: 0.04em;">
        Clima en ${UI.escapeHTML(route.city)}
      </h3>
      <div id="detail-weather"></div>
      <button class="btn btn--secondary u-mt-4" type="button" id="detail-weather-full">
        🌦️ Ver clima completo
      </button>
    `;

    // Clima según la ciudad de la ruta (async/await + fetch).
    renderDetailWeather(body.querySelector("#detail-weather"), route.city);

    // Botón heredado de la versión anterior: abre la vista Clima completa.
    body.querySelector("#detail-weather-full").addEventListener("click", () => {
      UI.closeModal("modal-detail");
      App.showView("clima");
      AppEvents.emit(AppEvents.EVENTS.WEATHER_SEARCH, { ciudad: route.city });
    });

    UI.openModal("modal-detail");
  }

  /**
   * Resumen compacto de clima dentro del detalle de la ruta
   * (usa la capa api.js heredada, con modo demo incluido).
   */
  async function renderDetailWeather(container, city) {
    UI.renderLoading(container, "Consultando clima…");
    const clima = await obtenerClima(city);

    if (clima.error) {
      container.innerHTML = `<p class="u-text-muted u-text-sm">${UI.escapeHTML(clima.error)}.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="detail-students__item">
        <span>
          <img src="${clima.icono}" alt="" style="width: 30px; height: 30px; vertical-align: middle;" />
          ${UI.escapeHTML(clima.descripcion)} en ${UI.escapeHTML(city)}
        </span>
        <strong>${clima.temp}°C</strong>
      </div>
    `;
  }

  /* ==================== API pública / inicialización ==================== */

  /** Permite que la búsqueda global controle el filtro de rutas. */
  function setSearch(term) {
    filters.search = term;
    document.getElementById("search-routes").value = term;
    render();
  }

  function init() {
    const container = document.getElementById("routes-container");

    /* --- Delegación de eventos: los Custom Events de <route-card> --- */
    container.addEventListener("route:view", (event) => openDetail(event.detail.id));
    container.addEventListener("route:edit", (event) => openForm(event.detail.id));
    container.addEventListener("route:delete", (event) => removeRoute(event.detail.id));

    /* --- Filtros y búsqueda en tiempo real --- */
    document.getElementById("search-routes").addEventListener(
      "input",
      UI.debounce((event) => {
        filters.search = event.target.value;
        render();
      })
    );

    document.getElementById("filter-status").addEventListener("change", (event) => {
      filters.status = event.target.value;
      render();
    });

    document.getElementById("filter-city").addEventListener("change", (event) => {
      filters.city = event.target.value;
      render();
    });

    document.getElementById("sort-routes").addEventListener("change", (event) => {
      filters.sort = event.target.value;
      render();
    });

    /* --- Formulario --- */
    const form = document.getElementById("form-route");
    form.addEventListener("submit", handleSubmit);
    Validation.attachLiveValidation(form, "route");

    /* --- Botones del modal de detalle --- */
    document.getElementById("detail-edit").addEventListener("click", () => {
      UI.closeModal("modal-detail");
      if (detailRouteId) openForm(detailRouteId);
    });

    document.getElementById("detail-delete").addEventListener("click", () => {
      UI.closeModal("modal-detail");
      if (detailRouteId) removeRoute(detailRouteId);
    });

    /* --- Quitar estudiante desde el detalle (delegación) --- */
    document.getElementById("detail-body").addEventListener("click", (event) => {
      const button = event.target.closest("[data-unassign]");
      if (!button) return;
      StudentsModule.unassignFromRoute(button.dataset.unassign);
      if (detailRouteId) openDetail(detailRouteId); // Refrescar el detalle.
    });

    /* --- La UI de rutas reacciona automáticamente a los eventos --- */
    const refresh = () => {
      refreshCityFilter();
      render();
    };

    AppEvents.on(AppEvents.EVENTS.ROUTE_CREATED, refresh);
    AppEvents.on(AppEvents.EVENTS.ROUTE_UPDATED, refresh);
    AppEvents.on(AppEvents.EVENTS.ROUTE_DELETED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_ASSIGNED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_REMOVED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_DELETED, refresh);

    refresh();
  }

  return { init, render, openForm, openDetail, setSearch, findRoute, studentsOfRoute, availableSeats };
})();
