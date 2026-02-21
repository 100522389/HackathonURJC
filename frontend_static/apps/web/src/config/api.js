// ========================================
// Configuración centralizada de la API
// ========================================
// Cambia API_BASE_URL cuando tengas el dominio de producción
// Ejemplo: "https://mi-backend.azurewebsites.net"

const API_BASE_URL = "http://localhost:8000";

const API = {
  BASE_URL: API_BASE_URL,

  // Servicio 1: Routing — A* Bidireccional (GET con query params)
  SEARCH: `${API_BASE_URL}/search`,

  // Servicio 2: Programación Lineal
  PL_OPTIMIZE: `${API_BASE_URL}/pl/optimize`,       // POST — Multi-Depot VRP (camiones/furgonetas)
  PL_TRANSFER: `${API_BASE_URL}/pl/transfer`,       // POST — Optimización aérea entre sucursales

  // Servicio 3: Machine Learning
  ML_PREDECIR_ZONA: `${API_BASE_URL}/ml/predecir-zona`, // POST — Predicción por historial
  ML_PREDICT_GPS:   `${API_BASE_URL}/ml/predict-gps`,   // POST — Predicción por GPS + historial

  // Health check
  HEALTH: `${API_BASE_URL}/health`,
};

export default API;
