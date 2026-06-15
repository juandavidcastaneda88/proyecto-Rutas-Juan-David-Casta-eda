/**
 * ui.js — Funciones de interfaz que se usan en toda la app:
 * notificaciones (toasts), abrir/cerrar modales y helpers de formato.
 */
"use strict";

/**
 * Escapa un texto para poder insertarlo dentro de HTML sin riesgo.
 * Ejemplo: "<b>hola</b>" se convierte en "&lt;b&gt;hola&lt;/b&gt;".
 */
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto === null || texto === undefined ? "" : String(texto);
  return div.innerHTML;
}

/**
 * Convierte una hora en formato 24h ("06:15") a formato legible ("6:15 a. m.").
 */
function formatearHora(hora24) {
  if (!hora24) return "—";

  const partes = hora24.split(":");
  const horas = Number(partes[0]);
  const minutos = partes[1];

  const sufijo = horas >= 12 ? "p. m." : "a. m.";
  let hora12 = horas % 12;
  if (hora12 === 0) hora12 = 12;

  return hora12 + ":" + minutos + " " + sufijo;
}

/* ======================= Notificaciones (toasts) ======================= */

const ICONOS_TOAST = {
  success: "✅",
  error: "⛔",
  warning: "⚠️",
  info: "ℹ️",
};

/**
 * Muestra una notificación flotante durante unos segundos.
 * @param {string} mensaje - Texto a mostrar.
 * @param {string} tipo - "success", "error", "warning" o "info".
 */
function mostrarToast(mensaje, tipo) {
  if (!tipo) tipo = "info";

  const contenedor = document.getElementById("toast-container");
  const aviso = document.createElement("div");
  aviso.className = "toast toast--" + tipo;
  aviso.setAttribute("role", "status");
  aviso.innerHTML = `
    <span aria-hidden="true">${ICONOS_TOAST[tipo]}</span>
    <p class="toast__message">${escaparHTML(mensaje)}</p>
    <button class="btn btn--ghost" type="button" aria-label="Cerrar notificación">✕</button>
  `;

  // El botón ✕ elimina el aviso, y también se elimina solo a los 3.5 segundos.
  aviso.querySelector("button").addEventListener("click", function () {
    aviso.remove();
  });
  setTimeout(function () {
    aviso.remove();
  }, 3500);

  contenedor.appendChild(aviso);
}

/* ======================= Modales ======================= */

/** Abre un modal (ventana emergente) por su id. */
function abrirModal(idModal) {
  const modal = document.getElementById(idModal);
  modal.hidden = false;
  document.body.style.overflow = "hidden"; // Evita el scroll del fondo.
}

/** Cierra un modal por su id. */
function cerrarModal(idModal) {
  const modal = document.getElementById(idModal);
  modal.hidden = true;
  document.body.style.overflow = "";
}

/** Cierra cualquier modal que esté abierto (se usa con la tecla Escape). */
function cerrarTodosLosModales() {
  const abiertos = document.querySelectorAll(".modal-overlay:not([hidden])");
  abiertos.forEach(function (modal) {
    cerrarModal(modal.id);
  });
}

/* ======================= Indicador de carga ======================= */

/** Muestra un "Cargando…" dentro de un contenedor. */
function mostrarCargando(contenedor, texto) {
  if (!texto) texto = "Cargando…";
  contenedor.innerHTML = `
    <div class="loading-inline">
      <span class="spinner" role="status" aria-label="${escaparHTML(texto)}"></span>
      <span>${escaparHTML(texto)}</span>
    </div>
  `;
}
