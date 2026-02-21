from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routing import search

backend = FastAPI(
    title="DHL Logistics Optimization API",
    description="API para optimización logística: routing, programación lineal y predicción de demanda",
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
backend.include_router(search.router, prefix="/search", tags=["Routing - A* Bidirectional"])


@backend.on_event("startup")
async def startup_event():
    print("Starting up the backend server...")
    # Cargar KD-Tree para búsqueda de nodos
    search.load_kdtree()


@backend.on_event("shutdown")
async def shutdown_event():
    print("No more backend server...")
