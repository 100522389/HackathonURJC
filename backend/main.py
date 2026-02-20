from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import re
import os

backend = FastAPI(title="Graph Search API")

#Permitir CORS para todas las rutas y orígenes (ajustar cuando tengamos nuestro dominio)
backend.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAPH_SEARCH_BIN = os.path.join(os.path.dirname(__file__), "..", "search_local", "graph_search")


class Coordinate(BaseModel):
    lat: float
    lon: float


class SearchResponse(BaseModel):
    source: int
    target: int
    found: bool
    cost: int | None = None
    nodes_expanded: int | None = None
    execution_time_ms: int | None = None
    path: list[int] = []
    geometry: list[Coordinate] = []


@backend.get("/search", response_model=SearchResponse)
def search(source: int, target: int):
    """
    Encuentra el camino más corto entre dos nodos del grafo USA-road DIMACS.
    Usa A* Bidireccional con heurística euclídea.
    """
    try:
        result = subprocess.run(
            [GRAPH_SEARCH_BIN, str(source), str(target)],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.join(os.path.dirname(__file__), "..", "search_local"),
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="El algoritmo superó el tiempo límite.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Ejecutable no encontrado: {GRAPH_SEARCH_BIN}")

    output = result.stdout

    if "No existe camino" in output:
        return SearchResponse(source=source, target=target, found=False)

    cost = None
    m = re.search(r"Coste total:\s*(\d+)", output)
    if m:
        cost = int(m.group(1))

    nodes_expanded = None
    m = re.search(r"Nodos expandidos:\s*(\d+)", output)
    if m:
        nodes_expanded = int(m.group(1))

    exec_time = None
    m = re.search(r"Tiempo de ejecución:\s*(\d+)\s*ms", output)
    if m:
        exec_time = int(m.group(1))

    path: list[int] = []
    m = re.search(r"Camino:\n(.+)", output)
    if m:
        path = [int(x) for x in re.findall(r"\d+", m.group(1))]

    if cost is None:
        raise HTTPException(status_code=500, detail=f"No se pudo parsear la salida:\n{output}")

    # Parsear posiciones del output
    geometry = []
    m = re.search(r"Posiciones:\n(.+?)\n\n", output, re.DOTALL)
    if m:
        coord_text = m.group(1).strip()
        for line in coord_text.split('\n'):
            parts = line.strip().split()
            if len(parts) == 2:
                lat = float(parts[0])
                lon = float(parts[1])
                geometry.append(Coordinate(lat=lat, lon=lon))

    return SearchResponse(
        source=source,
        target=target,
        found=True,
        cost=cost,
        nodes_expanded=nodes_expanded,
        execution_time_ms=exec_time,
        path=path,
        geometry=geometry,
    )


@backend.on_event("startup")
async def startup_event():
    print("Starting up the backend server...")


@backend.on_event("shutdown")
async def shutdown_event():
    print("Shutting down the backend server...")
