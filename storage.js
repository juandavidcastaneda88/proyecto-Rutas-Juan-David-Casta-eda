/**
 * storage.js — Capa de persistencia sobre LocalStorage.
 *
 * Centraliza la lectura/escritura de rutas y estudiantes para que el resto
 * de la aplicación no conozca los detalles de almacenamiento (separación
 * de responsabilidades). Incluye datos semilla para la primera ejecución.
 */
"use strict";

const StorageService = (() => {
  const KEYS = Object.freeze({
    ROUTES: "rutas-seguras-kids:routes",
    STUDENTS: "rutas-seguras-kids:students",
    SEEDED: "rutas-seguras-kids:seeded",
  });

  /** Ciudades disponibles en el sistema (usadas en formularios y clima). */
  const CITIES = Object.freeze([
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
  ]);

  /**
   * Genera un identificador único para rutas y estudiantes.
   * Usa crypto.randomUUID si está disponible (contextos seguros).
   * @returns {string}
   */
  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Lee y deserializa una clave de LocalStorage de forma segura.
   * @param {string} key
   * @param {*} fallback - Valor por defecto si no existe o está corrupto.
   */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.error(`[StorageService] No fue posible leer "${key}":`, error);
      return fallback;
    }
  }

  /**
   * Serializa y guarda un valor en LocalStorage de forma segura.
   * @param {string} key
   * @param {*} value
   */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[StorageService] No fue posible guardar "${key}":`, error);
    }
  }

  /* ----- API pública de rutas ----- */
  const loadRoutes = () => read(KEYS.ROUTES, []);
  const saveRoutes = (routes) => write(KEYS.ROUTES, routes);

  /* ----- API pública de estudiantes ----- */
  const loadStudents = () => read(KEYS.STUDENTS, []);
  const saveStudents = (students) => write(KEYS.STUDENTS, students);

  /**
   * Inserta datos de ejemplo SOLO en la primera ejecución, para que la
   * aplicación se vea funcional de inmediato. Las ejecuciones siguientes
   * respetan los datos del usuario (persistencia real).
   */
  function seedIfEmpty() {
    if (read(KEYS.SEEDED, false)) return;

    const routeIds = [generateId(), generateId(), generateId(), generateId()];

    const demoRoutes = [
      {
        id: routeIds[0],
        name: "Ruta Norte 01",
        driver: "Carlos Pérez",
        plate: "ABC-123",
        departureTime: "06:15",
        city: "Bogotá",
        capacity: 25,
        active: true,
        createdAt: Date.now() - 86400000 * 3,
      },
      {
        id: routeIds[1],
        name: "Ruta Centro 02",
        driver: "Luisa Martínez",
        plate: "DEF-456",
        departureTime: "06:40",
        city: "Medellín",
        capacity: 20,
        active: true,
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: routeIds[2],
        name: "Ruta Sur 03",
        driver: "Jorge Ramírez",
        plate: "GHI-789",
        departureTime: "07:00",
        city: "Cali",
        capacity: 18,
        active: false,
        createdAt: Date.now() - 86400000,
      },
      {
        id: routeIds[3],
        name: "Ruta Costa 04",
        driver: "Paola Herrera",
        plate: "JKL-012",
        departureTime: "06:30",
        city: "Barranquilla",
        capacity: 22,
        active: true,
        createdAt: Date.now(),
      },
    ];

    const demoStudents = [
      { fullName: "María Gómez Rojas", age: 8, grade: "Tercero", parentName: "Ana Rojas", phone: "3001234567", routeId: routeIds[0] },
      { fullName: "Samuel Torres León", age: 10, grade: "Quinto", parentName: "Pedro Torres", phone: "3109876543", routeId: routeIds[0] },
      { fullName: "Valentina Ortiz Cruz", age: 7, grade: "Segundo", parentName: "Lucía Cruz", phone: "3015550199", routeId: routeIds[1] },
      { fullName: "Tomás Rincón Silva", age: 12, grade: "Séptimo", parentName: "Marta Silva", phone: "3208887766", routeId: routeIds[1] },
      { fullName: "Isabella Castro Mora", age: 6, grade: "Primero", parentName: "Diego Castro", phone: "3174443322", routeId: routeIds[3] },
      { fullName: "Emiliano Vargas Paz", age: 9, grade: "Cuarto", parentName: "Sofía Paz", phone: "3056667788", routeId: "" },
    ].map((student) => ({ id: generateId(), createdAt: Date.now(), ...student }));

    saveRoutes(demoRoutes);
    saveStudents(demoStudents);
    write(KEYS.SEEDED, true);
  }

  return {
    CITIES,
    generateId,
    loadRoutes,
    saveRoutes,
    loadStudents,
    saveStudents,
    seedIfEmpty,
  };
})();

/**
 * AppState — Estado central en memoria de la aplicación.
 * Los módulos lo mutan y luego persisten mediante StorageService.
 */
const AppState = {
  routes: [],
  students: [],
};
