/**
 * storage.js — Guardado y carga de datos con LocalStorage.
 *
 * Aquí viven las dos listas principales de la aplicación:
 *  - rutas:       las rutas escolares.
 *  - estudiantes: los estudiantes registrados.
 *
 * Cada vez que algo cambia, se guarda en LocalStorage para que
 * los datos no se pierdan al recargar la página.
 */
"use strict";

// Claves con las que se guardan los datos en LocalStorage.
const CLAVE_RUTAS = "rutas-seguras-kids:routes";
const CLAVE_ESTUDIANTES = "rutas-seguras-kids:students";

// Ciudades disponibles en los formularios y en el clima.
const CIUDADES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Santa Marta",
  "Cúcuta",
];

// Estado de la aplicación: las dos listas con las que trabaja todo el código.
let rutas = [];
let estudiantes = [];

/** Crea un identificador único usando la fecha y un número al azar. */
function generarId() {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

/** Guarda la lista de rutas en LocalStorage (convertida a texto JSON). */
function guardarRutas() {
  localStorage.setItem(CLAVE_RUTAS, JSON.stringify(rutas));
}

/** Guarda la lista de estudiantes en LocalStorage. */
function guardarEstudiantes() {
  localStorage.setItem(CLAVE_ESTUDIANTES, JSON.stringify(estudiantes));
}

/**
 * Carga los datos guardados. Si es la primera vez que se abre la app
 * (no hay nada guardado), crea unos datos de ejemplo.
 */
function cargarDatos() {
  const rutasGuardadas = localStorage.getItem(CLAVE_RUTAS);
  const estudiantesGuardados = localStorage.getItem(CLAVE_ESTUDIANTES);

  if (rutasGuardadas) {
    rutas = JSON.parse(rutasGuardadas);
  }
  if (estudiantesGuardados) {
    estudiantes = JSON.parse(estudiantesGuardados);
  }

  if (!rutasGuardadas && !estudiantesGuardados) {
    crearDatosDeEjemplo();
  }
}

/** Datos de ejemplo para que la app se vea funcional la primera vez. */
function crearDatosDeEjemplo() {
  const idRuta1 = generarId();
  const idRuta2 = generarId();
  const idRuta3 = generarId();
  const idRuta4 = generarId();

  rutas = [
    { id: idRuta1, name: "Ruta Norte 01", driver: "Carlos Pérez", plate: "ABC-123", departureTime: "06:15", city: "Bogotá", capacity: 25, active: true, createdAt: Date.now() - 300000 },
    { id: idRuta2, name: "Ruta Centro 02", driver: "Luisa Martínez", plate: "DEF-456", departureTime: "06:40", city: "Medellín", capacity: 20, active: true, createdAt: Date.now() - 200000 },
    { id: idRuta3, name: "Ruta Sur 03", driver: "Jorge Ramírez", plate: "GHI-789", departureTime: "07:00", city: "Cali", capacity: 18, active: false, createdAt: Date.now() - 100000 },
    { id: idRuta4, name: "Ruta Costa 04", driver: "Paola Herrera", plate: "JKL-012", departureTime: "06:30", city: "Barranquilla", capacity: 22, active: true, createdAt: Date.now() },
  ];

  estudiantes = [
    { id: generarId(), fullName: "María Gómez Rojas", age: 8, grade: "Tercero", parentName: "Ana Rojas", phone: "3001234567", routeId: idRuta1, createdAt: Date.now() },
    { id: generarId(), fullName: "Samuel Torres León", age: 10, grade: "Quinto", parentName: "Pedro Torres", phone: "3109876543", routeId: idRuta1, createdAt: Date.now() },
    { id: generarId(), fullName: "Valentina Ortiz Cruz", age: 7, grade: "Segundo", parentName: "Lucía Cruz", phone: "3015550199", routeId: idRuta2, createdAt: Date.now() },
    { id: generarId(), fullName: "Tomás Rincón Silva", age: 12, grade: "Séptimo", parentName: "Marta Silva", phone: "3208887766", routeId: idRuta2, createdAt: Date.now() },
    { id: generarId(), fullName: "Isabella Castro Mora", age: 6, grade: "Primero", parentName: "Diego Castro", phone: "3174443322", routeId: idRuta4, createdAt: Date.now() },
    { id: generarId(), fullName: "Emiliano Vargas Paz", age: 9, grade: "Cuarto", parentName: "Sofía Paz", phone: "3056667788", routeId: "", createdAt: Date.now() },
  ];

  guardarRutas();
  guardarEstudiantes();
}
