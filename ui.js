/**
 * ui.js — Utilidades de interfaz: toasts, modales accesibles,
 * diálogo de confirmación y helpers de DOM/formato.
 */
"use strict";

const UI = (() => {
  /* ======================= Helpers de DOM ======================= */

  /**
   * Escapa texto para insertarlo de forma segura dentro de HTML.
   * @param {string} text
   * @returns {string}
   */
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  }

  /**
   * Convierte hora "HH:MM" (24h) a formato legible "6:15 a. m.".
   */
  function formatTime(time24) {
    if (!time24) return "—";
    const [hours, minutes] = time24.split(":").map(Number);
    const suffix = hours >= 12 ? "p. m." : "a. m.";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  /**
   * Resalta las coincidencias de búsqueda dentro de un texto (con <mark>).
   * El texto se escapa primero para evitar inyección de HTML.
   */
  function highlight(text, query) {
    const safe = escapeHTML(text);
    const term = String(query ?? "").trim();
    if (!term) return safe;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(`(${escapedTerm})`, "gi"), "<mark>$1</mark>");
  }

  /**
   * Pequeño debounce para búsquedas en tiempo real sin saturar el render.
   */
  function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ======================= Toasts ======================= */

  const TOAST_ICONS = {
    success: "✅",
    error: "⛔",
    warning: "⚠️",
    info: "ℹ️",
  };

  /**
   * Muestra una notificación tipo toast.
   * @param {string} message - Texto a mostrar.
   * @param {"success"|"error"|"warning"|"info"} [type]
   * @param {number} [duration] - Milisegundos visibles.
   */
  function toast(message, type = "info", duration = 3500) {
    const container = document.getElementById("toast-container");
    const item = document.createElement("div");
    item.className = `toast toast--${type}`;
    item.setAttribute("role", "status");
    item.innerHTML = `
      <span aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
      <p class="toast__message">${escapeHTML(message)}</p>
      <button class="btn btn--ghost" type="button" aria-label="Cerrar notificación">✕</button>
    `;

    const remove = () => {
      item.classList.add("toast--leaving");
      item.addEventListener("animationend", () => item.remove(), { once: true });
    };

    item.querySelector("button").addEventListener("click", remove);
    container.appendChild(item);
    setTimeout(remove, duration);
  }

  /* ======================= Modales accesibles ======================= */

  let lastFocusedElement = null;

  const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /**
   * Abre un modal por id: gestiona foco, tecla Escape y trampa de Tab.
   */
  function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;

    lastFocusedElement = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    // Enfocar el primer elemento interactivo del modal (accesibilidad).
    const focusable = overlay.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusable.length) focusable[0].focus();

    overlay.addEventListener("keydown", trapFocus);
  }

  /** Cierra un modal y devuelve el foco al elemento que lo abrió. */
  function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay || overlay.hidden) return;

    overlay.hidden = true;
    overlay.removeEventListener("keydown", trapFocus);
    document.body.style.overflow = "";

    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  /** Cierra cualquier modal abierto (usado con la tecla Escape). */
  function closeAllModals() {
    document.querySelectorAll(".modal-overlay:not([hidden])").forEach((overlay) => {
      closeModal(overlay.id);
    });
  }

  /** Mantiene el foco dentro del modal mientras esté abierto (WCAG). */
  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const overlay = event.currentTarget;
    const focusable = [...overlay.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ======================= Diálogo de confirmación ======================= */

  /**
   * Muestra un diálogo de confirmación y resuelve una Promesa con la decisión.
   * @param {string} title
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  function confirmDialog(title, message) {
    return new Promise((resolve) => {
      const titleEl = document.getElementById("confirm-title");
      const messageEl = document.getElementById("confirm-message");
      const acceptBtn = document.getElementById("confirm-accept");
      const cancelBtn = document.getElementById("confirm-cancel");

      titleEl.textContent = title;
      messageEl.textContent = message;

      const finish = (decision) => {
        acceptBtn.removeEventListener("click", onAccept);
        cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onEscape, true);
        closeModal("modal-confirm");
        resolve(decision);
      };

      const onAccept = () => finish(true);
      const onCancel = () => finish(false);
      // Escape equivale a cancelar: la Promesa siempre se resuelve.
      const onEscape = (event) => {
        if (event.key === "Escape") finish(false);
      };

      acceptBtn.addEventListener("click", onAccept);
      cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onEscape, true);
      openModal("modal-confirm");
    });
  }

  /* ======================= Estados de carga ======================= */

  /** Inserta un indicador de carga dentro de un contenedor. */
  function renderLoading(container, text = "Cargando…") {
    container.innerHTML = `
      <div class="loading-inline">
        <span class="spinner" role="status" aria-label="${escapeHTML(text)}"></span>
        <span>${escapeHTML(text)}</span>
      </div>
    `;
  }

  return {
    escapeHTML,
    formatTime,
    highlight,
    debounce,
    toast,
    openModal,
    closeModal,
    closeAllModals,
    confirmDialog,
    renderLoading,
  };
})();
