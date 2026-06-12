/**
 * custom-events.js — Bus de eventos personalizado de la aplicación.
 *
 * Define los nombres de los Custom Events del dominio y helpers para
 * emitirlos y escucharlos. La UI reacciona automáticamente a estos eventos,
 * desacoplando los módulos entre sí (patrón Pub/Sub sobre el DOM).
 *
 * Eventos principales requeridos: routeCreated, routeUpdated, studentAssigned.
 */
"use strict";

const AppEvents = (() => {
  /** Catálogo central de eventos del dominio. */
  const EVENTS = Object.freeze({
    ROUTE_CREATED: "routeCreated",
    ROUTE_UPDATED: "routeUpdated",
    ROUTE_DELETED: "routeDeleted",
    STUDENT_CREATED: "studentCreated",
    STUDENT_UPDATED: "studentUpdated",
    STUDENT_DELETED: "studentDeleted",
    STUDENT_ASSIGNED: "studentAssigned",
    STUDENT_REMOVED: "studentRemovedFromRoute",
    WEATHER_SEARCH: "clima:buscar", // La vista Clima escucha este evento
    DATA_CHANGED: "dataChanged", // Evento agregado: cualquier cambio de datos
  });

  /**
   * Emite un CustomEvent global con datos en `detail`.
   * @param {string} eventName - Nombre del evento (usar AppEvents.EVENTS).
   * @param {object} [detail] - Información asociada al evento.
   */
  function emit(eventName, detail = {}) {
    document.dispatchEvent(new CustomEvent(eventName, { detail }));

    // Los eventos de DATOS también notifican un cambio general, para que
    // el dashboard y los contadores se actualicen automáticamente.
    const isDataEvent =
      eventName !== EVENTS.DATA_CHANGED && eventName !== EVENTS.WEATHER_SEARCH;
    if (isDataEvent) {
      document.dispatchEvent(
        new CustomEvent(EVENTS.DATA_CHANGED, { detail: { source: eventName, ...detail } })
      );
    }
  }

  /**
   * Suscribe un callback a un evento del dominio.
   * @param {string} eventName - Nombre del evento.
   * @param {(detail: object, event: CustomEvent) => void} callback
   * @returns {() => void} Función para cancelar la suscripción.
   */
  function on(eventName, callback) {
    const handler = (event) => callback(event.detail, event);
    document.addEventListener(eventName, handler);
    return () => document.removeEventListener(eventName, handler);
  }

  return { EVENTS, emit, on };
})();
