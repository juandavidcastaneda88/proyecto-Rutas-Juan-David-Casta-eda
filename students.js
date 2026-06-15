/**
 * students.js — Gestión de estudiantes (registrar, editar, eliminar
 * y asignarlos a rutas con validación de cupos).
 */
"use strict";

// Filtros activos de la vista de estudiantes.
let filtroEstudiantesTexto = "";
let filtroEstudiantesRuta = "all"; // "all" | "none" | id de una ruta

/* ==================== Consultas ==================== */

/** Busca un estudiante por su id. Devuelve null si no existe. */
function buscarEstudiante(estudianteId) {
  for (const estudiante of estudiantes) {
    if (estudiante.id === estudianteId) return estudiante;
  }
  return null;
}

/** Aplica la búsqueda y el filtro de ruta a la lista de estudiantes. */
function obtenerEstudiantesVisibles() {
  const texto = filtroEstudiantesTexto.trim().toLowerCase();

  const filtrados = estudiantes.filter(function (estudiante) {
    const ruta = buscarRuta(estudiante.routeId);

    const coincideTexto =
      texto === "" ||
      estudiante.fullName.toLowerCase().includes(texto) ||
      estudiante.parentName.toLowerCase().includes(texto) ||
      estudiante.grade.toLowerCase().includes(texto) ||
      (ruta !== null && ruta.name.toLowerCase().includes(texto));

    const coincideRuta =
      filtroEstudiantesRuta === "all" ||
      (filtroEstudiantesRuta === "none" && !estudiante.routeId) ||
      estudiante.routeId === filtroEstudiantesRuta;

    return coincideTexto && coincideRuta;
  });

  // Ordenar alfabéticamente por nombre.
  filtrados.sort(function (a, b) {
    return a.fullName.localeCompare(b.fullName, "es");
  });

  return filtrados;
}

/* ==================== Renderizado (pintar en pantalla) ==================== */

/** Pinta la tabla de estudiantes. */
function pintarEstudiantes() {
  const tbody = document.getElementById("students-tbody");
  const estadoVacio = document.getElementById("students-empty");
  const tabla = document.querySelector("#view-students .table-wrapper");
  const visibles = obtenerEstudiantesVisibles();

  let html = "";
  for (const estudiante of visibles) {
    const ruta = buscarRuta(estudiante.routeId);

    // Insignia de la ruta (o "Sin asignar" si no tiene).
    let badgeRuta = '<span class="badge badge--warning">Sin asignar</span>';
    if (ruta) {
      badgeRuta = '<span class="badge badge--info">' + escaparHTML(ruta.name) + "</span>";
    }

    html += `
      <tr>
        <td>${escaparHTML(estudiante.fullName)}</td>
        <td>${estudiante.age} años</td>
        <td>${escaparHTML(estudiante.grade)}</td>
        <td>${escaparHTML(estudiante.parentName)}</td>
        <td>${escaparHTML(estudiante.phone)}</td>
        <td>${badgeRuta}</td>
        <td>
          <div class="data-table__actions">
            <button class="btn btn--ghost" type="button" title="Editar estudiante"
                    onclick="abrirFormularioEstudiante('${estudiante.id}')">✏️</button>
            <button class="btn btn--ghost" type="button" title="Eliminar estudiante"
                    onclick="eliminarEstudiante('${estudiante.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
  estadoVacio.hidden = visibles.length > 0;
  tabla.hidden = visibles.length === 0;
}

/**
 * Llena los dos <select> de rutas:
 *  - El filtro de la tabla (todas las rutas).
 *  - El del formulario (solo rutas activas; las llenas se deshabilitan).
 */
function actualizarSelectsDeRutas() {
  const selectFiltro = document.getElementById("filter-student-route");
  const selectFormulario = document.getElementById("student-route");

  const filtroActual = selectFiltro.value || "all";
  const formularioActual = selectFormulario.value || "";

  // Rutas ordenadas por nombre.
  const rutasOrdenadas = [...rutas];
  rutasOrdenadas.sort(function (a, b) {
    return a.name.localeCompare(b.name, "es");
  });

  // --- Select del filtro ---
  let htmlFiltro = '<option value="all">Todas</option><option value="none">Sin asignar</option>';
  for (const ruta of rutasOrdenadas) {
    htmlFiltro += `<option value="${ruta.id}">${escaparHTML(ruta.name)}</option>`;
  }
  selectFiltro.innerHTML = htmlFiltro;
  selectFiltro.value = filtroActual;
  if (selectFiltro.value === "") selectFiltro.value = "all";

  // --- Select del formulario ---
  let htmlFormulario = '<option value="">Sin asignar</option>';
  for (const ruta of rutasOrdenadas) {
    if (!ruta.active) continue; // Solo rutas activas.

    const cupos = cuposDisponibles(ruta);
    // Se deshabilita si está llena, salvo que sea la ruta actual del estudiante.
    const deshabilitada = cupos <= 0 && ruta.id !== formularioActual ? "disabled" : "";
    htmlFormulario += `<option value="${ruta.id}" ${deshabilitada}>${escaparHTML(ruta.name)} · ${cupos} cupo(s) disponible(s)</option>`;
  }
  selectFormulario.innerHTML = htmlFormulario;
  selectFormulario.value = formularioActual;
}

/* ==================== Formulario (crear / editar) ==================== */

/**
 * Abre el modal del formulario de estudiante.
 * Si recibe un id, carga los datos de ese estudiante para editarlo.
 */
function abrirFormularioEstudiante(estudianteId) {
  const formulario = document.getElementById("form-student");
  const titulo = document.getElementById("modal-student-title");
  const botonGuardar = document.getElementById("student-submit");

  formulario.reset();
  limpiarErrores(formulario);
  actualizarSelectsDeRutas();

  if (estudianteId) {
    const estudiante = buscarEstudiante(estudianteId);
    if (!estudiante) return;

    titulo.textContent = "Editar estudiante";
    botonGuardar.textContent = "Actualizar estudiante";
    formulario.elements.id.value = estudiante.id;
    formulario.elements.fullName.value = estudiante.fullName;
    formulario.elements.age.value = estudiante.age;
    formulario.elements.grade.value = estudiante.grade;
    formulario.elements.parentName.value = estudiante.parentName;
    formulario.elements.phone.value = estudiante.phone;

    // Habilitar la opción de su ruta actual (aunque esté llena) y seleccionarla.
    for (const opcion of formulario.elements.routeId.options) {
      if (opcion.value === estudiante.routeId) opcion.disabled = false;
    }
    formulario.elements.routeId.value = estudiante.routeId || "";
  } else {
    titulo.textContent = "Nuevo estudiante";
    botonGuardar.textContent = "Guardar estudiante";
    formulario.elements.id.value = "";
  }

  abrirModal("modal-student");
}

/** Se ejecuta al enviar el formulario de estudiante: valida y guarda. */
function guardarEstudiante(evento) {
  evento.preventDefault();
  const formulario = evento.target;

  // 1. Validar los campos.
  if (!validarFormularioEstudiante(formulario)) {
    mostrarToast("Revisa los campos marcados en rojo.", "warning");
    return;
  }

  const idEdicion = formulario.elements.id.value; // Vacío si es nuevo.
  const datos = {
    fullName: formulario.elements.fullName.value.trim(),
    age: Number(formulario.elements.age.value),
    grade: formulario.elements.grade.value,
    parentName: formulario.elements.parentName.value.trim(),
    phone: formulario.elements.phone.value.trim(),
    routeId: formulario.elements.routeId.value,
  };

  // 2. Revisar que no haya otro estudiante con el mismo nombre.
  for (const estudiante of estudiantes) {
    if (estudiante.id === idEdicion) continue;
    if (estudiante.fullName.toLowerCase() === datos.fullName.toLowerCase()) {
      mostrarErrorCampo(formulario, "fullName", "Ya existe un estudiante con este nombre.");
      return;
    }
  }

  // 3. Validar la ruta seleccionada (si eligió una).
  if (datos.routeId !== "") {
    const ruta = buscarRuta(datos.routeId);

    if (!ruta) {
      mostrarErrorCampo(formulario, "routeId", "La ruta seleccionada ya no existe.");
      return;
    }
    if (!ruta.active) {
      mostrarErrorCampo(formulario, "routeId", "No se puede asignar a una ruta inactiva.");
      return;
    }

    // Si es nuevo o cambió de ruta, debe haber cupo disponible.
    let rutaAnterior = "";
    if (idEdicion) {
      rutaAnterior = buscarEstudiante(idEdicion).routeId;
    }
    if (datos.routeId !== rutaAnterior && cuposDisponibles(ruta) <= 0) {
      mostrarErrorCampo(formulario, "routeId", 'La ruta "' + ruta.name + '" está llena.');
      return;
    }
  }

  // 4. Guardar: actualizar el estudiante existente o crear uno nuevo.
  if (idEdicion) {
    const estudiante = buscarEstudiante(idEdicion);
    estudiante.fullName = datos.fullName;
    estudiante.age = datos.age;
    estudiante.grade = datos.grade;
    estudiante.parentName = datos.parentName;
    estudiante.phone = datos.phone;
    estudiante.routeId = datos.routeId;
    mostrarToast('Estudiante "' + estudiante.fullName + '" actualizado.', "success");
  } else {
    const nuevoEstudiante = {
      id: generarId(),
      createdAt: Date.now(),
      fullName: datos.fullName,
      age: datos.age,
      grade: datos.grade,
      parentName: datos.parentName,
      phone: datos.phone,
      routeId: datos.routeId,
    };
    estudiantes.push(nuevoEstudiante);
    mostrarToast('Estudiante "' + nuevoEstudiante.fullName + '" registrado.', "success");
  }

  guardarEstudiantes();
  cerrarModal("modal-student");
  refrescarTodo();
}

/* ==================== Eliminación / quitar de ruta ==================== */

/** Elimina un estudiante, pidiendo confirmación primero. */
function eliminarEstudiante(estudianteId) {
  const estudiante = buscarEstudiante(estudianteId);
  if (!estudiante) return;

  const mensaje =
    'Se eliminará a "' + estudiante.fullName + '" del sistema. Esta acción no se puede deshacer.';
  if (!confirm(mensaje)) return;

  estudiantes = estudiantes.filter(function (item) {
    return item.id !== estudianteId;
  });
  guardarEstudiantes();

  mostrarToast('Estudiante "' + estudiante.fullName + '" eliminado.', "info");
  refrescarTodo();
}

/** Quita a un estudiante de su ruta actual (sin eliminarlo). */
function quitarEstudianteDeRuta(estudianteId) {
  const estudiante = buscarEstudiante(estudianteId);
  if (!estudiante || !estudiante.routeId) return;

  estudiante.routeId = "";
  guardarEstudiantes();

  mostrarToast('"' + estudiante.fullName + '" quedó sin ruta asignada.', "info");
  refrescarTodo();
}

/* ==================== Inicialización ==================== */

/** Conecta los eventos de la vista de estudiantes (se llama una sola vez). */
function iniciarEstudiantes() {
  // Búsqueda dentro de la vista de estudiantes.
  document.getElementById("search-students").addEventListener("input", function (evento) {
    filtroEstudiantesTexto = evento.target.value;
    pintarEstudiantes();
  });

  // Filtro por ruta.
  document.getElementById("filter-student-route").addEventListener("change", function (evento) {
    filtroEstudiantesRuta = evento.target.value;
    pintarEstudiantes();
  });

  // Envío del formulario.
  document.getElementById("form-student").addEventListener("submit", guardarEstudiante);
}
