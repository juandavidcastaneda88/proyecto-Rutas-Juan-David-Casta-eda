/**
 * validation.js — Validación de los formularios.
 *
 * Hay una función para validar el formulario de rutas y otra para el de
 * estudiantes. Cada una revisa los campos con condiciones simples (if)
 * y muestra el mensaje de error debajo del campo correspondiente.
 */
"use strict";

/* ----- Expresiones regulares (patrones de texto) ----- */

// Solo letras (con tildes y ñ) y espacios.
const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]+$/;

// Teléfono: entre 7 y 10 dígitos.
const PATRON_TELEFONO = /^\d{7,10}$/;

// Placa: 3 letras + 3 números, con guion opcional. Ej: ABC-123 o ABC123.
const PATRON_PLACA = /^[A-Za-z]{3}-?\d{3}$/;

/**
 * Escribe un mensaje de error debajo de un campo del formulario.
 * Si el mensaje está vacío, el error desaparece.
 */
function mostrarErrorCampo(formulario, nombreCampo, mensaje) {
  const campo = formulario.elements[nombreCampo];
  const cajaError = campo.closest(".form-field").querySelector(".form-field__error");
  cajaError.textContent = mensaje;
  if (mensaje) campo.focus();
}

/** Borra todos los mensajes de error de un formulario. */
function limpiarErrores(formulario) {
  const errores = formulario.querySelectorAll(".form-field__error");
  errores.forEach(function (caja) {
    caja.textContent = "";
  });
}

/**
 * Valida el formulario de rutas campo por campo.
 * @returns {boolean} true si todo está bien, false si hay algún error.
 */
function validarFormularioRuta(formulario) {
  limpiarErrores(formulario);
  let valido = true;

  const nombre = formulario.elements.name.value.trim();
  if (nombre === "") {
    mostrarErrorCampo(formulario, "name", "Este campo es obligatorio.");
    valido = false;
  } else if (nombre.length < 3) {
    mostrarErrorCampo(formulario, "name", "Debe tener mínimo 3 caracteres.");
    valido = false;
  }

  const conductor = formulario.elements.driver.value.trim();
  if (conductor === "") {
    mostrarErrorCampo(formulario, "driver", "Este campo es obligatorio.");
    valido = false;
  } else if (!PATRON_NOMBRE.test(conductor)) {
    mostrarErrorCampo(formulario, "driver", "Solo se permiten letras y espacios.");
    valido = false;
  }

  const placa = formulario.elements.plate.value.trim();
  if (placa === "") {
    mostrarErrorCampo(formulario, "plate", "Este campo es obligatorio.");
    valido = false;
  } else if (!PATRON_PLACA.test(placa)) {
    mostrarErrorCampo(formulario, "plate", "Formato de placa inválido. Ej: ABC-123.");
    valido = false;
  }

  const hora = formulario.elements.departureTime.value;
  if (hora === "") {
    mostrarErrorCampo(formulario, "departureTime", "Ingresa una hora válida.");
    valido = false;
  }

  const ciudad = formulario.elements.city.value;
  if (ciudad === "") {
    mostrarErrorCampo(formulario, "city", "Selecciona una ciudad.");
    valido = false;
  }

  const capacidad = Number(formulario.elements.capacity.value);
  if (formulario.elements.capacity.value === "") {
    mostrarErrorCampo(formulario, "capacity", "Este campo es obligatorio.");
    valido = false;
  } else if (isNaN(capacidad) || capacidad < 1 || capacidad > 60) {
    mostrarErrorCampo(formulario, "capacity", "Debe estar entre 1 y 60.");
    valido = false;
  }

  return valido;
}

/**
 * Valida el formulario de estudiantes campo por campo.
 * @returns {boolean} true si todo está bien, false si hay algún error.
 */
function validarFormularioEstudiante(formulario) {
  limpiarErrores(formulario);
  let valido = true;

  const nombre = formulario.elements.fullName.value.trim();
  if (nombre === "") {
    mostrarErrorCampo(formulario, "fullName", "Este campo es obligatorio.");
    valido = false;
  } else if (nombre.length < 3) {
    mostrarErrorCampo(formulario, "fullName", "Debe tener mínimo 3 caracteres.");
    valido = false;
  } else if (!PATRON_NOMBRE.test(nombre)) {
    mostrarErrorCampo(formulario, "fullName", "Solo se permiten letras y espacios.");
    valido = false;
  }

  const edad = Number(formulario.elements.age.value);
  if (formulario.elements.age.value === "") {
    mostrarErrorCampo(formulario, "age", "Este campo es obligatorio.");
    valido = false;
  } else if (isNaN(edad) || edad < 3 || edad > 18) {
    mostrarErrorCampo(formulario, "age", "Debe estar entre 3 y 18.");
    valido = false;
  }

  const grado = formulario.elements.grade.value;
  if (grado === "") {
    mostrarErrorCampo(formulario, "grade", "Selecciona un grado.");
    valido = false;
  }

  const acudiente = formulario.elements.parentName.value.trim();
  if (acudiente === "") {
    mostrarErrorCampo(formulario, "parentName", "Este campo es obligatorio.");
    valido = false;
  } else if (!PATRON_NOMBRE.test(acudiente)) {
    mostrarErrorCampo(formulario, "parentName", "Solo se permiten letras y espacios.");
    valido = false;
  }

  const telefono = formulario.elements.phone.value.trim();
  if (telefono === "") {
    mostrarErrorCampo(formulario, "phone", "Este campo es obligatorio.");
    valido = false;
  } else if (!PATRON_TELEFONO.test(telefono)) {
    mostrarErrorCampo(formulario, "phone", "Ingresa un teléfono válido (7 a 10 dígitos).");
    valido = false;
  }

  return valido;
}
