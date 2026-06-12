/**
 * components/route-card.js — Web Component <route-card>.
 *
 * Tarjeta reutilizable para mostrar una ruta escolar:
 *  - class RouteCard extends HTMLElement
 *  - Shadow DOM con estilos encapsulados
 *  - <template id="template-route-card"> definido en index.html
 *  - Propiedades dinámicas (route, studentsCount) con re-render automático
 *  - Emite CustomEvents (route:view, route:edit, route:delete) que burbujean
 *    fuera del Shadow DOM para que routes.js los maneje por delegación.
 */
"use strict";

class RouteCard extends HTMLElement {
  /** Datos privados del componente. */
  #route = null;
  #studentsCount = 0;

  constructor() {
    super();

    // Shadow DOM en modo abierto + clon del template declarado en el HTML.
    this.attachShadow({ mode: "open" });
    const template = document.getElementById("template-route-card");
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // Los clics de los botones internos se traducen a Custom Events
    // (composed: true para que crucen la frontera del Shadow DOM).
    this.#bindAction("view", "route:view");
    this.#bindAction("edit", "route:edit");
    this.#bindAction("delete", "route:delete");
  }

  /* ----- Propiedad dinámica: objeto ruta completo ----- */
  set route(value) {
    this.#route = value;
    this.#render();
  }

  get route() {
    return this.#route;
  }

  /* ----- Propiedad dinámica: número de estudiantes asignados ----- */
  set studentsCount(value) {
    this.#studentsCount = Number(value) || 0;
    this.#render();
  }

  get studentsCount() {
    return this.#studentsCount;
  }

  /** Asocia un botón interno a un CustomEvent externo. */
  #bindAction(refName, eventName) {
    this.shadowRoot.querySelector(`[data-ref="${refName}"]`).addEventListener("click", () => {
      if (!this.#route) return;
      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { id: this.#route.id },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  /** Helper para escribir texto en un nodo del Shadow DOM. */
  #setText(refName, text) {
    this.shadowRoot.querySelector(`[data-ref="${refName}"]`).textContent = text;
  }

  /** Renderiza (o re-renderiza) la tarjeta con los datos actuales. */
  #render() {
    if (!this.#route) return;

    const route = this.#route;
    const occupancy = route.capacity > 0 ? this.#studentsCount / route.capacity : 0;
    const percent = Math.min(100, Math.round(occupancy * 100));

    this.#setText("name", route.name);
    this.#setText("driver", route.driver);
    this.#setText("plate", route.plate.toUpperCase());
    this.#setText("time", UI.formatTime(route.departureTime));
    this.#setText("city", route.city);
    this.#setText("occupancy-text", `${this.#studentsCount} / ${route.capacity} estudiantes`);

    // Badge de estado activo/inactivo.
    const badge = this.shadowRoot.querySelector('[data-ref="status"]');
    badge.textContent = route.active ? "Activa" : "Inactiva";
    badge.className = `badge ${route.active ? "active" : "inactive"}`;

    // Barra de ocupación con código de color y atributos ARIA.
    const bar = this.shadowRoot.querySelector('[data-ref="bar"]');
    const fill = this.shadowRoot.querySelector('[data-ref="bar-fill"]');
    fill.style.width = `${percent}%`;
    fill.classList.toggle("warn", percent >= 70 && percent < 100);
    fill.classList.toggle("full", percent >= 100);
    bar.setAttribute("aria-valuenow", String(this.#studentsCount));
    bar.setAttribute("aria-valuemax", String(route.capacity));
    bar.setAttribute(
      "aria-label",
      `Ocupación de la ruta: ${this.#studentsCount} de ${route.capacity} puestos`
    );

    // Etiqueta accesible para toda la tarjeta.
    this.setAttribute("aria-label", `Ruta ${route.name}, conductor ${route.driver}`);
  }
}

// Registro del componente personalizado.
customElements.define("route-card", RouteCard);
