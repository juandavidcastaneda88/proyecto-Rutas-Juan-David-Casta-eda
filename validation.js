/**
 * validation.js — Motor de validación de formularios en tiempo real.
 *
 * Reglas declarativas por campo + validación al escribir (input) y al
 * enviar (submit). Los mensajes se muestran junto al campo y se marcan
 * con aria-invalid para accesibilidad.
 */
"use strict";

const Validation = (() => {
  /* ----- Expresiones regulares reutilizables ----- */
  const PATTERNS = Object.freeze({
    // Nombres: letras (incluye tildes y ñ), espacios, apóstrofes y guiones.
    NAME: /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü'’-]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñÜü'’-]+)*$/,
    // Teléfonos colombianos: 7 a 10 dígitos, admite espacios y guiones.
    PHONE: /^\d[\d\s-]{5,12}\d$/,
    // Placas: 3 letras + separador opcional + 3 dígitos (ABC-123, ABC123).
    PLATE: /^[A-Za-z]{3}[\s-]?\d{3}$/,
    // Hora en formato 24h HH:MM.
    TIME: /^([01]\d|2[0-3]):[0-5]\d$/,
  });

  /* ----- Validadores atómicos (cada uno retorna mensaje o "") ----- */
  const validators = {
    required: (value) => (String(value).trim() === "" ? "Este campo es obligatorio." : ""),
    minLength: (value, min) =>
      String(value).trim().length < min ? `Debe tener mínimo ${min} caracteres.` : "",
    maxLength: (value, max) =>
      String(value).trim().length > max ? `Debe tener máximo ${max} caracteres.` : "",
    name: (value) =>
      PATTERNS.NAME.test(String(value).trim()) ? "" : "Solo se permiten letras y espacios.",
    phone: (value) =>
      PATTERNS.PHONE.test(String(value).trim()) ? "" : "Ingresa un teléfono válido (7 a 10 dígitos).",
    plate: (value) =>
      PATTERNS.PLATE.test(String(value).trim()) ? "" : "Formato de placa inválido. Ej: ABC-123.",
    time: (value) => (PATTERNS.TIME.test(String(value)) ? "" : "Ingresa una hora válida."),
    numberRange: (value, min, max) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return "Ingresa un número válido.";
      if (num < min || num > max) return `Debe estar entre ${min} y ${max}.`;
      return "";
    },
  };

  /**
   * Esquemas de validación por formulario.
   * Cada campo define una lista de reglas [nombreValidador, ...argumentos].
   */
  const SCHEMAS = Object.freeze({
    route: {
      name: [["required"], ["minLength", 3], ["maxLength", 40]],
      driver: [["required"], ["minLength", 3], ["maxLength", 50], ["name"]],
      plate: [["required"], ["plate"]],
      departureTime: [["required"], ["time"]],
      city: [["required"]],
      capacity: [["required"], ["numberRange", 1, 60]],
    },
    student: {
      fullName: [["required"], ["minLength", 3], ["maxLength", 60], ["name"]],
      age: [["required"], ["numberRange", 3, 18]],
      grade: [["required"]],
      parentName: [["required"], ["minLength", 3], ["maxLength", 50], ["name"]],
      phone: [["required"], ["phone"]],
    },
  });

  /**
   * Valida un único valor contra una lista de reglas.
   * @returns {string} Primer mensaje de error encontrado, o "" si es válido.
   */
  function validateValue(value, rules) {
    for (const [ruleName, ...args] of rules) {
      const message = validators[ruleName](value, ...args);
      if (message) return message;
    }
    return "";
  }

  /**
   * Pinta el estado visual y accesible de un campo.
   * @param {HTMLElement} input - El input/select validado.
   * @param {string} message - Mensaje de error ("" si es válido).
   */
  function renderFieldState(input, message) {
    const field = input.closest(".form-field");
    const errorBox = field ? field.querySelector(".form-field__error") : null;

    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (field) field.classList.toggle("form-field--valid", !message && input.value !== "");
    if (errorBox) errorBox.textContent = message;
  }

  /**
   * Valida un formulario completo según su esquema.
   * @param {HTMLFormElement} form
   * @param {string} schemaName - Clave dentro de SCHEMAS ("route" | "student").
   * @returns {boolean} true si todo el formulario es válido.
   */
  function validateForm(form, schemaName) {
    const schema = SCHEMAS[schemaName];
    let isValid = true;
    let firstInvalid = null;

    for (const fieldName of Object.keys(schema)) {
      const input = form.elements[fieldName];
      if (!input) continue;

      const message = validateValue(input.value, schema[fieldName]);
      renderFieldState(input, message);

      if (message && isValid) {
        isValid = false;
        firstInvalid = input;
      } else if (message) {
        isValid = false;
      }
    }

    // Accesibilidad: enfocar el primer campo con error.
    if (firstInvalid) firstInvalid.focus();
    return isValid;
  }

  /**
   * Activa la validación EN TIEMPO REAL de un formulario:
   * cada campo se valida mientras el usuario escribe (evento "input")
   * usando delegación de eventos sobre el propio formulario.
   */
  function attachLiveValidation(form, schemaName) {
    const schema = SCHEMAS[schemaName];

    form.addEventListener("input", (event) => {
      const input = event.target;
      const rules = schema[input.name];
      if (!rules) return;
      renderFieldState(input, validateValue(input.value, rules));
    });
  }

  /** Limpia todos los estados de validación de un formulario. */
  function resetFormState(form) {
    form.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
    form.querySelectorAll(".form-field--valid").forEach((el) => el.classList.remove("form-field--valid"));
    form.querySelectorAll(".form-field__error").forEach((el) => (el.textContent = ""));
  }

  /**
   * Muestra un error de negocio (ej: duplicados, capacidad) en un campo puntual.
   */
  function showFieldError(form, fieldName, message) {
    const input = form.elements[fieldName];
    if (!input) return;
    renderFieldState(input, message);
    input.focus();
  }

  return { validateForm, attachLiveValidation, resetFormState, showFieldError, PATTERNS };
})();
