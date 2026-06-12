/**
 * students.js — Módulo de gestión de estudiantes.
 *
 * Responsabilidades:
 *  - Registrar, editar y eliminar estudiantes.
 *  - Asignarlos / removerlos de rutas con validación de capacidad.
 *  - Renderizar la tabla usando <template id="template-student-row">.
 *  - Emitir los Custom Events studentAssigned / studentRemovedFromRoute.
 */
"use strict";

const StudentsModule = (() => {
  /** Filtros activos de la vista de estudiantes. */
  const filters = {
    search: "",
    route: "all", // "all" | "none" | id de ruta
  };

  /* ==================== Consultas ==================== */

  function findStudent(studentId) {
    return AppState.students.find((student) => student.id === studentId) || null;
  }

  /** Aplica búsqueda y filtro de ruta sobre la colección. */
  function getVisibleStudents() {
    const term = filters.search.trim().toLowerCase();

    return AppState.students
      .filter((student) => {
        const route = RoutesModule.findRoute(student.routeId);
        const matchesSearch =
          !term ||
          student.fullName.toLowerCase().includes(term) ||
          student.parentName.toLowerCase().includes(term) ||
          student.grade.toLowerCase().includes(term) ||
          (route && route.name.toLowerCase().includes(term));

        const matchesRoute =
          filters.route === "all" ||
          (filters.route === "none" && !student.routeId) ||
          student.routeId === filters.route;

        return matchesSearch && matchesRoute;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  }

  /* ==================== Renderizado ==================== */

  /**
   * Renderiza la tabla de estudiantes clonando el <template> de fila.
   * Demuestra uso de HTML Templates + creación/eliminación de nodos.
   */
  function render() {
    const tbody = document.getElementById("students-tbody");
    const emptyState = document.getElementById("students-empty");
    const template = document.getElementById("template-student-row");
    const visibleStudents = getVisibleStudents();

    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (const student of visibleStudents) {
      const row = template.content.cloneNode(true);
      const route = RoutesModule.findRoute(student.routeId);

      // El nombre se resalta si coincide con la búsqueda activa.
      row.querySelector('[data-cell="name"]').innerHTML = UI.highlight(
        student.fullName,
        filters.search
      );
      row.querySelector('[data-cell="age"]').textContent = `${student.age} años`;
      row.querySelector('[data-cell="grade"]').textContent = student.grade;
      row.querySelector('[data-cell="parent"]').innerHTML = UI.highlight(
        student.parentName,
        filters.search
      );
      row.querySelector('[data-cell="phone"]').textContent = student.phone;
      row.querySelector('[data-cell="route"]').innerHTML = route
        ? `<span class="badge badge--info">${UI.escapeHTML(route.name)}</span>`
        : '<span class="badge badge--warning">Sin asignar</span>';

      // Las acciones llevan el id del estudiante (delegación de eventos).
      row.querySelector('[data-action="edit-student"]').dataset.id = student.id;
      row.querySelector('[data-action="delete-student"]').dataset.id = student.id;

      fragment.appendChild(row);
    }

    tbody.appendChild(fragment);
    emptyState.hidden = visibleStudents.length > 0;
    document.querySelector("#view-students .table-wrapper").hidden = visibleStudents.length === 0;
  }

  /**
   * Actualiza los <select> que listan rutas:
   *  - Filtro de la tabla (todas las rutas).
   *  - Formulario de estudiante (solo rutas activas; las llenas se deshabilitan).
   */
  function refreshRouteSelects() {
    const filterSelect = document.getElementById("filter-student-route");
    const formSelect = document.getElementById("student-route");

    const currentFilter = filterSelect.value || "all";
    const currentForm = formSelect.value || "";

    filterSelect.innerHTML = `
      <option value="all">Todas</option>
      <option value="none">Sin asignar</option>
    `;
    formSelect.innerHTML = '<option value="">Sin asignar</option>';

    const sortedRoutes = [...AppState.routes].sort((a, b) => a.name.localeCompare(b.name, "es"));

    for (const route of sortedRoutes) {
      const filterOption = document.createElement("option");
      filterOption.value = route.id;
      filterOption.textContent = route.name;
      filterSelect.appendChild(filterOption);

      if (route.active) {
        const seats = RoutesModule.availableSeats(route);
        const formOption = document.createElement("option");
        formOption.value = route.id;
        formOption.textContent = `${route.name} · ${seats} cupo(s) disponible(s)`;
        // Se deshabilita si está llena, salvo que sea la ruta actual del estudiante.
        formOption.disabled = seats <= 0 && route.id !== currentForm;
        formSelect.appendChild(formOption);
      }
    }

    filterSelect.value = [...filterSelect.options].some((o) => o.value === currentFilter)
      ? currentFilter
      : "all";
    formSelect.value = [...formSelect.options].some((o) => o.value === currentForm)
      ? currentForm
      : "";
  }

  /* ==================== Formulario (crear / editar) ==================== */

  function openForm(studentId = null) {
    const form = document.getElementById("form-student");
    const title = document.getElementById("modal-student-title");
    const submitBtn = document.getElementById("student-submit");

    form.reset();
    Validation.resetFormState(form);
    refreshRouteSelects();

    if (studentId) {
      const student = findStudent(studentId);
      if (!student) return;

      title.textContent = "Editar estudiante";
      submitBtn.textContent = "Actualizar estudiante";
      form.elements.id.value = student.id;
      form.elements.fullName.value = student.fullName;
      form.elements.age.value = student.age;
      form.elements.grade.value = student.grade;
      form.elements.parentName.value = student.parentName;
      form.elements.phone.value = student.phone;

      // Asegurar que la opción de su ruta actual esté habilitada.
      const option = [...form.elements.routeId.options].find((o) => o.value === student.routeId);
      if (option) option.disabled = false;
      form.elements.routeId.value = student.routeId || "";
    } else {
      title.textContent = "Nuevo estudiante";
      submitBtn.textContent = "Guardar estudiante";
      form.elements.id.value = "";
    }

    UI.openModal("modal-student");
  }

  /**
   * Valida y persiste el formulario de estudiante.
   * Incluye duplicados (nombre + acudiente) y validación de capacidad.
   */
  function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;

    if (!Validation.validateForm(form, "student")) {
      UI.toast("Revisa los campos marcados en rojo.", "warning");
      return;
    }

    const editingId = form.elements.id.value || null;
    const data = {
      fullName: form.elements.fullName.value.trim(),
      age: Number(form.elements.age.value),
      grade: form.elements.grade.value,
      parentName: form.elements.parentName.value.trim(),
      phone: form.elements.phone.value.trim(),
      routeId: form.elements.routeId.value,
    };

    // Duplicados: mismo nombre completo (ignorando mayúsculas/acentos básicos).
    const duplicate = AppState.students.some(
      (student) =>
        student.id !== editingId &&
        student.fullName.toLowerCase() === data.fullName.toLowerCase()
    );
    if (duplicate) {
      Validation.showFieldError(form, "fullName", "Ya existe un estudiante con este nombre.");
      return;
    }

    // Validación de capacidad de la ruta seleccionada.
    if (data.routeId) {
      const route = RoutesModule.findRoute(data.routeId);
      const previousRouteId = editingId ? findStudent(editingId)?.routeId : null;

      if (!route) {
        Validation.showFieldError(form, "routeId", "La ruta seleccionada ya no existe.");
        return;
      }
      if (!route.active) {
        Validation.showFieldError(form, "routeId", "No se puede asignar a una ruta inactiva.");
        return;
      }
      // Si cambia de ruta (o es nuevo), debe haber cupo disponible.
      if (data.routeId !== previousRouteId && RoutesModule.availableSeats(route) <= 0) {
        Validation.showFieldError(
          form,
          "routeId",
          `La ruta "${route.name}" está llena (${route.capacity}/${route.capacity}).`
        );
        return;
      }
    }

    if (editingId) {
      const student = findStudent(editingId);
      const previousRouteId = student.routeId;
      Object.assign(student, data);
      StorageService.saveStudents(AppState.students);

      AppEvents.emit(AppEvents.EVENTS.STUDENT_UPDATED, { student });

      // Si cambió de ruta, emitir los eventos de asignación correspondientes.
      if (previousRouteId !== student.routeId) {
        if (previousRouteId) {
          AppEvents.emit(AppEvents.EVENTS.STUDENT_REMOVED, { student, routeId: previousRouteId });
        }
        if (student.routeId) {
          AppEvents.emit(AppEvents.EVENTS.STUDENT_ASSIGNED, {
            student,
            route: RoutesModule.findRoute(student.routeId),
          });
        }
      }
      UI.toast(`Estudiante "${student.fullName}" actualizado.`, "success");
    } else {
      const student = { id: StorageService.generateId(), createdAt: Date.now(), ...data };
      AppState.students.push(student);
      StorageService.saveStudents(AppState.students);

      AppEvents.emit(AppEvents.EVENTS.STUDENT_CREATED, { student });
      if (student.routeId) {
        AppEvents.emit(AppEvents.EVENTS.STUDENT_ASSIGNED, {
          student,
          route: RoutesModule.findRoute(student.routeId),
        });
      }
      UI.toast(`Estudiante "${student.fullName}" registrado.`, "success");
    }

    UI.closeModal("modal-student");
  }

  /* ==================== Eliminación / desasignación ==================== */

  async function removeStudent(studentId) {
    const student = findStudent(studentId);
    if (!student) return;

    const confirmed = await UI.confirmDialog(
      "Eliminar estudiante",
      `Se eliminará a "${student.fullName}" del sistema. Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    AppState.students = AppState.students.filter((item) => item.id !== studentId);
    StorageService.saveStudents(AppState.students);

    AppEvents.emit(AppEvents.EVENTS.STUDENT_DELETED, { student });
    UI.toast(`Estudiante "${student.fullName}" eliminado.`, "info");
  }

  /** Quita a un estudiante de su ruta actual (sin eliminarlo). */
  function unassignFromRoute(studentId) {
    const student = findStudent(studentId);
    if (!student || !student.routeId) return;

    const routeId = student.routeId;
    student.routeId = "";
    StorageService.saveStudents(AppState.students);

    AppEvents.emit(AppEvents.EVENTS.STUDENT_REMOVED, { student, routeId });
    UI.toast(`"${student.fullName}" quedó sin ruta asignada.`, "info");
  }

  /* ==================== API pública / inicialización ==================== */

  /** Permite que la búsqueda global controle el filtro de estudiantes. */
  function setSearch(term) {
    filters.search = term;
    document.getElementById("search-students").value = term;
    render();
  }

  function init() {
    /* --- Búsqueda y filtros en tiempo real --- */
    document.getElementById("search-students").addEventListener(
      "input",
      UI.debounce((event) => {
        filters.search = event.target.value;
        render();
      })
    );

    document.getElementById("filter-student-route").addEventListener("change", (event) => {
      filters.route = event.target.value;
      render();
    });

    /* --- Formulario --- */
    const form = document.getElementById("form-student");
    form.addEventListener("submit", handleSubmit);
    Validation.attachLiveValidation(form, "student");

    /* --- Delegación de eventos en la tabla (editar / eliminar) --- */
    document.getElementById("students-tbody").addEventListener("click", (event) => {
      const editBtn = event.target.closest('[data-action="edit-student"]');
      if (editBtn) {
        openForm(editBtn.dataset.id);
        return;
      }
      const deleteBtn = event.target.closest('[data-action="delete-student"]');
      if (deleteBtn) removeStudent(deleteBtn.dataset.id);
    });

    /* --- Reaccionar a cambios de rutas y estudiantes --- */
    const refresh = () => {
      refreshRouteSelects();
      render();
    };

    AppEvents.on(AppEvents.EVENTS.ROUTE_CREATED, refresh);
    AppEvents.on(AppEvents.EVENTS.ROUTE_UPDATED, refresh);
    AppEvents.on(AppEvents.EVENTS.ROUTE_DELETED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_CREATED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_UPDATED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_DELETED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_ASSIGNED, refresh);
    AppEvents.on(AppEvents.EVENTS.STUDENT_REMOVED, refresh);

    refresh();
  }

  return { init, render, openForm, unassignFromRoute, setSearch };
})();
