from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess as ss
import re
import os
import numpy as np
from scipy.spatial import cKDTree as cKDTree22

backend = FastAPI(title="Logistics Sostenibility Optimization API")

#Permitir CORS para todas las rutas y orígenes (Ajustar cuando tengamos el dominio)
backend.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAPH_SEARCH_BIN = os.path.join(os.path.dirname(__file__), "..", "search_local", "graph_search")
CO_FILE = os.path.join(os.path.dirname(__file__), "..", "search_local", "DIMAC", "USA-road-d.USA.co")

# El árbol de búsqueda (Global) — se construye una sola vez en el startup
_kdt: cKDTree22 | None = None
_node_ids: np.ndarray | None = None  # shape (N,)  dtype int32


class Position(BaseModel):
    lat: float
    lon: float


class SearchResponse(BaseModel):
    source_lat: float
    source_lon: float
    target_lat: float
    target_lon: float
    source_node: int
    target_node: int
    found: bool
    cost: int | None = None
    nodes_expanded: int | None = None
    execution_time_ms: int | None = None
    path: list[int] = []
    geometry: list[Position] = []


def _nearest_node(lat: float, lon: float) -> int:
    """Devuelve el ID del nodo del grafo más cercano a la posición dada."""
    if _kdt is None:
        raise HTTPException(status_code=503, detail="Árbol de búsqueda no inicializado. El servidor aún está cargando.")
    _, idx = _kdt.query([lat, lon])
    return int(_node_ids[idx])


@backend.get("/search", response_model=SearchResponse)
def search(source_lat: float, source_lon: float, target_lat: float, target_lon: float):
    """
    Encuentra el camino óptimo entre 2 puntos geográficos en el grafo USA-road DIMACS.
    Recibe posición (lat, lon) y resuelve internamente los nodos más cercanos.
    Usa A* Bidirectional con la distancia euclídea como heurística.
    """
    source = _nearest_node(source_lat, source_lon)
    target = _nearest_node(target_lat, target_lon)
    try:
        result = ss.run(
            [GRAPH_SEARCH_BIN, str(source), str(target)],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.join(os.path.dirname(__file__), "..", "search_local"),
        )
    except ss.TimeoutExpired:
        raise HTTPException(status_code=504, detail="El algoritmo superó el tiempo límite.")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Ejecutable no encontrado: {GRAPH_SEARCH_BIN}")

    output = result.stdout

    if "No existe camino" in output:
        return SearchResponse(
            source_lat=source_lat, source_lon=source_lon,
            target_lat=target_lat, target_lon=target_lon,
            source_node=source, target_node=target,
            found=False
        )

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

    # Parsear posiciones en el output
    geometry = []
    m = re.search(r"Posiciones:\n(.+?)\n\n", output, re.DOTALL)
    if m:
        coord_text = m.group(1).strip()
        for line in coord_text.split('\n'):
            parts = line.strip().split()
            if len(parts) == 2:
                lat = float(parts[0])
                lon = float(parts[1])
                geometry.append(Position(lat=lat, lon=lon)) # Leaflet

    return SearchResponse(
        source_lat=source_lat,
        source_lon=source_lon,
        target_lat=target_lat,
        target_lon=target_lon,
        source_node=source,
        target_node=target,
        found=True,
        cost=cost,
        nodes_expanded=nodes_expanded,
        execution_time_ms=exec_time,
        path=path,
        geometry=geometry,
    )


@backend.on_event("startup")
async def startup_event():
    global _kdt, _node_ids
    print("Cargando coordenadas del grafo desde el archivo .co...")
    node_ids = []
    lats = []
    lons = []
    co_path = os.path.abspath(CO_FILE)
    with open(co_path, "r") as f:
        for line in f:
            if line.startswith('v '):
                parts = line.split()
                node_ids.append(int(parts[1]))
                lons.append(int(parts[2]) / 1_000_000)  # x → lon
                lats.append(int(parts[3]) / 1_000_000)  # y → lat
    _node_ids = np.array(node_ids, dtype=np.int32)
    positions = np.column_stack([lats, lons])  # shape (N, 2): [lat, lon]
    _kdt = cKDTree22(positions)
    print(f"KD-tree construido con {len(node_ids):,} nodos.")


@backend.on_event("shutdown")
async def shutdown_event():
    print("No more backend server...")
