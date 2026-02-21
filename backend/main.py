from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routing import search, pl, ml


backend = FastAPI(
    title="Sostenibility Optimization API",
    description="API para optimización logística: routing, programación lineal y predicción de demanda por zonas densas",
    version="1.0.1",
)

# Permitir CORS para todas las rutas y orígenes (Ajustar cuando tengamos el dominio)
backend.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
backend.include_router(search.router1, prefix="/search", tags=["Routing de alta escala - A* Bidirectional"])
backend.include_router(pl.router2, prefix="/pl", tags=["Optimización mediante PL - Multi-Depot VRP"])
backend.include_router(ml.router3, prefix="/ml", tags=["Predicción de pedidos por zona mediante ML - LightGBM en series temporales"])


@backend.on_event("startup")
async def startup_event():
    print("Starting up the backend server...")
    search.load_kdt() # (scipy.spatial) para búsqueda de nodos


@backend.on_event("shutdown")
async def shutdown_event():
    print("No more backend server...")
