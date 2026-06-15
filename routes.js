/**
 * routes.js — Gestión de rutas escolares (crear, editar, eliminar, ver).
 *
 * Las tarjetas de las rutas se construyen con plantillas de texto
 * (template strings) y se insertan en la página con innerHTML.
 */
"use strict";

// Filtros activos de la vista de rutas.
let filtroRutasTexto = "";
let filtroRutasEstado = "all";
let filtroRutasCiudad = "all";
let ordenRutas = "name";

// Id de la ruta que se está mostrando en el modal de detalle.
let rutaDetalleId = null;

/* ==================== Consultas ==================== */

/** Devuelve los estudiantes asignados a una ruta. */
function estudiantesDeRuta(rutaId) {
  return estudiantes.filter(function (estudiante) {
    return estudiante.routeId === rutaId;
  });
}

/** Busca una ruta por su id. Devuelve null si no existe. */
function buscarRuta(rutaId) {
  for (const ruta of rutas) {
    if (ruta.id === rutaId) return ruta;
  }
  return null;
}

/** Cupos libres de una ruta. */
function cuposDisponibles(ruta) {
  return ruta.capacity - estudiantesDeRuta(ruta.id).length;
}

/** Aplica la búsqueda, los filtros y el ordenamiento a la lista de rutas. */
function obtenerRutasVisibles() {
  const texto = filtroRutasTexto.trim().toLowerCase();

  // 1. Filtrar.
  const filtradas = rutas.filter(function (ruta) {
    const coincideTexto =
      texto === "" ||
      ruta.name.toLowerCase().includes(texto) ||
      ruta.driver.toLowerCase().includes(texto) ||
      ruta.plate.toLowerCase().includes(texto) ||
      ruta.city.toLowerCase().includes(texto);

    const coincideEstado =
      filtroRutasEstado === "all" ||
      (filtroRutasEstado === "active" && ruta.active) ||
      (filtroRutasEstado === "inactive" && !ruta.active);

    const coincideCiudad = filtroRutasCiudad === "all" || ruta.city === filtroRutasCiudad;

    return coincideTexto && coincideEstado && coincideCiudad;
  });

  // 2. Ordenar según la opción elegida.
  filtradas.sort(function (a, b) {
    if (ordenRutas === "time") {
      return a.departureTime.localeCompare(b.departureTime);
    }
    if (ordenRutas === "capacity") {
      return b.capacity - a.capacity;
    }
    if (ordenRutas === "occupancy") {
      const ocupacionA = estudiantesDeRuta(a.id).length / a.capacity;
      const ocupacionB = estudiantesDeRuta(b.id).length / b.capacity;
      return ocupacionB - ocupacionA;
    }
    return a.name.localeCompare(b.name, "es"); // Por nombre (opción por defecto).
  });

  return filtradas;
}

/* ==================== Renderizado (pintar en pantalla) ==================== */

/** Crea el HTML de una tarjeta de ruta. */
function crearTarjetaRuta(ruta) {
  const asignados = estudiantesDeRuta(ruta.id).length;

  // Porcentaje de ocupación para la barra de progreso.
  let porcentaje = 0;
  if (ruta.capacity > 0) {
    porcentaje = Math.round((asignados / ruta.capacity) * 100);
  }
  if (porcentaje > 100) porcentaje = 100;

  // Color de la barra: normal, amarilla (casi llena) o roja (llena).
  let claseBarra = "";
  if (porcentaje >= 100) {
    claseBarra = " full";
  } else if (porcentaje >= 70) {
    claseBarra = " warn";
  }

  const claseEstado = ruta.active ? "active" : "inactive";
  const textoEstado = ruta.active ? "Activa" : "Inactiva";

  return `
    <article class="route-card">
      <div class="route-card__head">
        <h3 class="route-card__name">${escaparHTML(ruta.name)}</h3>
        <span class="route-card__badge ${claseEstado}">${textoEstado}</span>
      </div>

      <dl class="route-card__meta">
        <div><dt>Conductor</dt><dd>${escaparHTML(ruta.driver)}</dd></div>
        <div><dt>Placa</dt><dd>${escaparHTML(ruta.plate)}</dd></div>
        <div><dt>Salida</dt><dd>${formatearHora(ruta.departureTime)}</dd></div>
        <div><dt>Ciudad</dt><dd>${escaparHTML(ruta.city)}</dd></div>
      </dl>

      <div class="route-card__occupancy">
        <span class="route-card__label">
          <span>Ocupación</span>
          <span>${asignados} / ${ruta.capacity} estudiantes</span>
        </span>
        <div class="route-card__bar">
          <div class="route-card__bar-fill${claseBarra}" style="width: ${porcentaje}%"></div>
        </div>
      </div>

      <div class="route-card__actions">
        <button type="button" class="rc-btn rc-btn--view" onclick="verDetalleRuta('${ruta.id}')">Ver detalle</button>
        <button type="button" class="rc-btn rc-btn--edit" onclick="abrirFormularioRuta('${ruta.id}')">Editar</button>
        <button type="button" class="rc-btn rc-btn--delete" onclick="eliminarRuta('${ruta.id}')">Eliminar</button>
      </div>
    </article>
  `;
}

/** Pinta todas las tarjetas de rutas en la pantalla. */
function pintarRutas() {
  const contenedor = document.getElementById("routes-container");
  const estadoVacio = document.getElementById("routes-empty");
  const visibles = obtenerRutasVisibles();

  let html = "";
  for (const ruta of visibles) {
    html += crearTarjetaRuta(ruta);
  }
  contenedor.innerHTML = html;

  // Si no hay rutas, se muestra el mensaje de "no hay resultados".
  estadoVacio.hidden = visibles.length > 0;
  contenedor.hidden = visibles.length === 0;
}

/** Llena el filtro de ciudades con las ciudades que tienen rutas. */
function actualizarFiltroCiudades() {
  const select = document.getElementById("filter-city");
  const valorActual = select.value || "all";

  // Lista de ciudades sin repetir.
  const ciudadesUsadas = [];
  for (const ruta of rutas) {
    if (!ciudadesUsadas.includes(ruta.city)) {
      ciudadesUsadas.push(ruta.city);
    }
  }
  ciudadesUsadas.sort();

  let html = '<option value="all">Todas</option>';
  for (const ciudad of ciudadesUsadas) {
    html += `<option value="${escaparHTML(ciudad)}">${escaparHTML(ciudad)}</option>`;
  }
  select.innerHTML = html;

  // Mantener la selección anterior si la ciudad todavía existe.
  if (ciudadesUsadas.includes(valorActual)) {
    select.value = valorActual;
  } else {
    select.value = "all";
  }
}

/* ==================== Formulario (crear / editar) ==================== */

/**
 * Abre el modal del formulario de ruta.
 * Si recibe un id, carga los datos de esa ruta para editarla.
 */
function abrirFormularioRuta(rutaId) {
  const formulario = document.getElementById("form-route");
  const titulo = document.getElementById("modal-route-title");
  const botonGuardar = document.getElementById("route-submit");

  formulario.reset();
  limpiarErrores(formulario);

  if (rutaId) {
    const ruta = buscarRuta(rutaId);
    if (!ruta) return;

    titulo.textContent = "Editar ruta";
    botonGuardar.textContent = "Actualizar ruta";
    formulario.elements.id.value = ruta.id;
    formulario.elements.name.value = ruta.name;
    formulario.elements.driver.value = ruta.driver;
    formulario.elements.plate.value = ruta.plate;
    formulario.elements.departureTime.value = ruta.departureTime;
    formulario.elements.city.value = ruta.city;
    formulario.elements.capacity.value = ruta.capacity;
    formulario.elements.active.checked = ruta.active;
  } else {
    titulo.textContent = "Nueva ruta";
    botonGuardar.textContent = "Guardar ruta";
    formulario.elements.id.value = "";
    formulario.elements.active.checked = true;
  }

  abrirModal("modal-route");
}

/** Se ejecuta al enviar el formulario de ruta: valida y guarda. */
function guardarRuta(evento) {
  evento.preventDefault(); // Evita que la página se recargue.
  const formulario = evento.target;

  // 1. Validar los campos.
  if (!validarFormularioRuta(formulario)) {
    mostrarToast("Revisa los campos marcados en rojo.", "warning");
    return;
  }

  const idEdicion = formulario.elements.id.value; // Vacío si es una ruta nueva.
  const datos = {
    name: formulario.elements.name.value.trim(),
    driver: formulario.elements.driver.value.trim(),
    plate: formulario.elements.plate.value.trim().toUpperCase(),
    departureTime: formulario.elements.departureTime.value,
    city: formulario.elements.city.value,
    capacity: Number(formulario.elements.capacity.value),
    active: formulario.elements.active.checked,
  };

  // 2. Revisar que el nombre y la placa no estén repetidos.
  for (const ruta of rutas) {
    if (ruta.id === idEdicion) continue; // No compararse consigo misma.

    if (ruta.name.toLowerCase() === datos.name.toLowerCase()) {
      mostrarErrorCampo(formulario, "name", "Ya existe una ruta con este nombre.");
      return;
    }
    if (ruta.plate.toUpperCase() === datos.plate) {
      mostrarErrorCampo(formulario, "plate", "Esta placa ya está registrada en otra ruta.");
      return;
    }
  }

  // 3. La capacidad no puede ser menor que los estudiantes ya asignados.
  if (idEdicion) {
    const asignados = estudiantesDeRuta(idEdicion).length;
    if (datos.capacity < asignados) {
      mostrarErrorCampo(
        formulario,
        "capacity",
        "La ruta ya tiene " + asignados + " estudiantes asignados. La capacidad no puede ser menor."
      );
      return;
    }
  }

  // 4. Guardar: actualizar la ruta existente o crear una nueva.
  if (idEdicion) {
    const ruta = buscarRuta(idEdicion);
    ruta.name = datos.name;
    ruta.driver = datos.driver;
    ruta.plate = datos.plate;
    ruta.departureTime = datos.departureTime;
    ruta.city = datos.city;
    ruta.capacity = datos.capacity;
    ruta.active = datos.active;
    mostrarToast('Ruta "' + ruta.name + '" actualizada correctamente.', "success");
  } else {
    const nuevaRuta = {
      id: generarId(),
      createdAt: Date.now(),
      name: datos.name,
      driver: datos.driver,
      plate: datos.plate,
      departureTime: datos.departureTime,
      city: datos.city,
      capacity: datos.capacity,
      active: datos.active,
    };
    rutas.push(nuevaRuta);
    mostrarToast('Ruta "' + nuevaRuta.name + '" creada correctamente.', "success");
  }

  guardarRutas();
  cerrarModal("modal-route");
  refrescarTodo();
}

/* ==================== Eliminación ==================== */

/**
 * Elimina una ruta, pidiendo confirmación primero.
 * Los estudiantes asignados quedan "sin ruta" (no se eliminan).
 */
function eliminarRuta(rutaId) {
  const ruta = buscarRuta(rutaId);
  if (!ruta) return;

  const asignados = estudiantesDeRuta(rutaId).length;
  let mensaje = 'Se eliminará la ruta "' + ruta.name + '". Esta acción no se puede deshacer.';
  if (asignados > 0) {
    mensaje =
      'La ruta "' + ruta.name + '" tiene ' + asignados +
      " estudiante(s) asignado(s). Quedarán sin ruta. Esta acción no se puede deshacer.";
  }

  // confirm() muestra el cuadro de confirmación del navegador.
  if (!confirm(mensaje)) return;

  // Dejar sin ruta a los estudiantes que estaban asignados.
  for (const estudiante of estudiantes) {
    if (estudiante.routeId === rutaId) {
      estudiante.routeId = "";
    }
  }
  guardarEstudiantes();

  // Quitar la ruta de la lista.
  rutas = rutas.filter(function (item) {
    return item.id !== rutaId;
  });
  guardarRutas();

  mostrarToast('Ruta "' + ruta.name + '" eliminada.', "info");
  refrescarTodo();
}

/* ==================== Detalle de ruta ==================== */

/** Abre el modal de detalle con los datos, estudiantes y clima de la ruta. */
function verDetalleRuta(rutaId) {
  const ruta = buscarRuta(rutaId);
  if (!ruta) return;

  rutaDetalleId = rutaId;
  const cuerpo = document.getElementById("detail-body");
  const asignados = estudiantesDeRuta(rutaId);

  // Lista de estudiantes asignados.
  let listaEstudiantes = "";
  if (asignados.length === 0) {
    listaEstudiantes = '<li class="detail-students__item"><span>Sin estudiantes asignados todavía.</span></li>';
  } else {
    for (const estudiante of asignados) {
      listaEstudiantes += `
        <li class="detail-students__item">
          <span>🎒 ${escaparHTML(estudiante.fullName)} · ${escaparHTML(estudiante.grade)}</span>
          <button class="btn btn--ghost" type="button" title="Quitar de la ruta"
                  onclick="quitarDeRutaDesdeDetalle('${estudiante.id}')">
            Quitar ✕
          </button>
        </li>
      `;
    }
  }

  const badgeEstado = ruta.active
    ? '<span class="badge badge--success">Activa</span>'
    : '<span class="badge badge--danger">Inactiva</span>';

  cuerpo.innerHTML = `
    <dl class="detail-grid">
      <div><dt>Nombre de la ruta</dt><dd>${escaparHTML(ruta.name)}</dd></div>
      <div><dt>Estado</dt><dd>${badgeEstado}</dd></div>
      <div><dt>Conductor</dt><dd>${escaparHTML(ruta.driver)}</dd></div>
      <div><dt>Placa del vehículo</dt><dd>${escaparHTML(ruta.plate)}</dd></div>
      <div><dt>Hora de salida</dt><dd>${formatearHora(ruta.departureTime)}</dd></div>
      <div><dt>Ciudad</dt><dd>${escaparHTML(ruta.city)}</dd></div>
      <div><dt>Capacidad</dt><dd>${ruta.capacity} puestos</dd></div>
      <div><dt>Cupos disponibles</dt><dd>${cuposDisponibles(ruta)} puestos</dd></div>
    </dl>

    <h3 class="u-text-sm u-text-muted u-mb-4" style="text-transform: uppercase; letter-spacing: 0.04em;">
      Estudiantes asignados (${asignados.length})
    </h3>
    <ul class="detail-students u-mb-4">${listaEstudiantes}</ul>

    <h3 class="u-text-sm u-text-muted u-mb-4" style="text-transform: uppercase; letter-spacing: 0.04em;">
      Clima en ${escaparHTML(ruta.city)}
    </h3>
    <div id="detail-weather"></div>
    <button class="btn btn--secondary u-mt-4" type="button" onclick="abrirVistaClimaConCiudad('${escaparHTML(ruta.city)}')">
      🌦️ Ver clima completo
    </button>
  `;

  // Pedir el clima de la ciudad de la ruta.
  pintarClimaDelDetalle(ruta.city);

  abrirModal("modal-detail");
}

/** Muestra un resumen del clima dentro del detalle de la ruta. */
async function pintarClimaDelDetalle(ciudad) {
  const contenedor = document.getElementById("detail-weather");
  mostrarCargando(contenedor, "Consultando clima…");

  const clima = await obtenerClimaSimple(ciudad);

  if (clima.error) {
    contenedor.innerHTML = '<p class="u-text-muted u-text-sm">' + escaparHTML(clima.error) + ".</p>";
    return;
  }

  contenedor.innerHTML = `
    <div class="detail-students__item">
      <span>
        <img src="${clima.icono}" alt="" style="width: 30px; height: 30px; vertical-align: middle;" />
        ${escaparHTML(clima.descripcion)} en ${escaparHTML(ciudad)}
      </span>
      <strong>${clima.temp}°C</strong>
    </div>
  `;
}

/** Quita un estudiante de la ruta desde el modal de detalle y lo refresca. */
function quitarDeRutaDesdeDetalle(estudianteId) {
  quitarEstudianteDeRuta(estudianteId);
  if (rutaDetalleId) {
    verDetalleRuta(rutaDetalleId);
  }
}

/* ==================== Inicialización ==================== */

/** Conecta los eventos de la vista de rutas (se llama una sola vez). */
function iniciarRutas() {
  // Búsqueda dentro de la vista de rutas.
  document.getElementById("search-routes").addEventListener("input", function (evento) {
    filtroRutasTexto = evento.target.value;
    pintarRutas();
  });

  // Filtros y ordenamiento.
  document.getElementById("filter-status").addEventListener("change", function (evento) {
    filtroRutasEstado = evento.target.value;
    pintarRutas();
  });

  document.getElementById("filter-city").addEventListener("change", function (evento) {
    filtroRutasCiudad = evento.target.value;
    pintarRutas();
  });

  document.getElementById("sort-routes").addEventListener("change", function (evento) {
    ordenRutas = evento.target.value;
    pintarRutas();
  });

  // Envío del formulario.
  document.getElementById("form-route").addEventListener("submit", guardarRuta);

  // Botones del modal de detalle.
  document.getElementById("detail-edit").addEventListener("click", function () {
    cerrarModal("modal-detail");
    if (rutaDetalleId) abrirFormularioRuta(rutaDetalleId);
  });

  document.getElementById("detail-delete").addEventListener("click", function () {
    cerrarModal("modal-detail");
    if (rutaDetalleId) eliminarRuta(rutaDetalleId);
  });
}
