"""
Router para el servicio de programación lineal — Multi-Depot VRP con flota heterogénea.

Pipeline:
  1. Usuario envía JSON con depots (id, lat, lng), flota (VAN/TRUCK por depósito)
     y clientes (id, lat, lng, nS, nM, nL).
  2. Se calcula la matriz de distancias Haversine con factor de desvío vial.
  3. Se resuelve el MDVRP (CVRP por depósito, 2 fases).
  Se devuelve las rutas, ocupación, km totales y tiempo de resolución.
"""
from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

router2 = APIRouter()


# CONSTANTES

_EARTH_RADIUS_KM = 6_371.0

CAP: Dict[str, float] = {"VAN": 10.0, "TRUCK": 20.0}   # m³
VOL: Dict[str, float] = {"S": 0.04, "M": 0.20, "L": 0.60}  # m³ por paquete

_SCALE = 1000      # OR-Tools trabaja con enteros → multiplicamos km × _SCALE
_VOL_SCALE = 10000  # precisión para volúmenes S/M/L


# MODELOS PYDANTIC

class DepotIn(BaseModel):
    id: str
    lat: float
    lng: float
    desc: Optional[str] = None


class ClientIn(BaseModel):
    id: str
    lat: float
    lng: float
    nS: int = 0
    nM: int = 0
    nL: int = 0


class VRPRequest(BaseModel):
    depots: List[DepotIn]
    flota: Dict[str, Dict[str, int]]
    clients: List[ClientIn]
    time_limit: int = 60
    road_factor: float = 1.3


class VRPResponse(BaseModel):
    status: str
    objective_km: Optional[float]
    vehicles_used: List[str]
    routes: Dict[str, List[str]]
    occupancy: Dict[str, float]
    solver_time: float
    gap: Optional[float]
    detail: Optional[str] = None


# DISTANCIAS

def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distancia en km entre dos puntos (lat, lng) en grados decimales."""
    rlat1, rlng1 = math.radians(lat1), math.radians(lng1)
    rlat2, rlng2 = math.radians(lat2), math.radians(lng2)
    dlat = rlat2 - rlat1
    dlng = rlng2 - rlng1
    a = (math.sin(dlat / 2) ** 2
         + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2)
    return _EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_distance_matrix(
    nodes: List[Dict[str, Any]],
    road_factor: float = 1.3,
) -> Dict[Tuple[str, str], float]:
    """Construye la matriz de distancias completa entre todos los nodos."""
    dist: Dict[Tuple[str, str], float] = {}
    n = len(nodes)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = nodes[i], nodes[j]
            d = round(_haversine(a["lat"], a["lng"], b["lat"], b["lng"]) * road_factor, 2)
            dist[(a["id"], b["id"])] = d
            dist[(b["id"], a["id"])] = d
    return dist


# VALIDACIÓN

def _validate_request(req: VRPRequest) -> None:
    if not req.depots:
        raise HTTPException(status_code=422, detail="Se necesita al menos un depósito.")
    if not req.clients:
        raise HTTPException(status_code=422, detail="Se necesita al menos un cliente.")

    depot_ids = {d.id for d in req.depots}

    for did in req.flota:
        if did not in depot_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Flota contiene depósito '{did}' que no existe en depots.",
            )
    for did in depot_ids:
        if did not in req.flota:
            raise HTTPException(
                status_code=422,
                detail=f"Depósito '{did}' no tiene flota definida en flota.",
            )
    for vtype_dict in req.flota.values():
        for vtype in vtype_dict:
            if vtype not in CAP:
                raise HTTPException(
                    status_code=422,
                    detail=f"Tipo de vehículo desconocido: '{vtype}'. Valores válidos: {list(CAP)}.",
                )

    checked: set = set()
    for nid in [d.id for d in req.depots] + [c.id for c in req.clients]:
        if nid in checked:
            raise HTTPException(status_code=422, detail=f"ID duplicado: '{nid}'.")
        checked.add(nid)


# SOLVER: utilidades internas

def _client_volume(c: dict) -> float:
    return c.get("nS", 0) * VOL["S"] + c.get("nM", 0) * VOL["M"] + c.get("nL", 0) * VOL["L"]


def _build_vehicles(flota: Dict[str, Dict[str, int]]) -> List[Dict[str, str]]:
    vehicles: List[Dict[str, str]] = []
    for depot_id, types in flota.items():
        for vtype, count in types.items():
            for idx in range(count):
                vehicles.append({"id": f"{depot_id}_{vtype}_{idx}", "depot": depot_id, "type": vtype})
    return vehicles


def _clients_to_depots(
    depots: List[dict],
    clients: List[dict],
    flota: Dict[str, Dict[str, int]],
    dist_matrix: Dict[Tuple[str, str], float],
) -> Dict[str, List[dict]]:
    """Fase 1: asigna cada cliente al depósito más cercano con capacidad disponible."""
    depot_ids = [d["id"] for d in depots]
    depot_cap = {
        did: sum(CAP[vt] * cnt for vt, cnt in flota.get(did, {}).items())
        for did in depot_ids
    }
    depot_vol_used: Dict[str, float] = {did: 0.0 for did in depot_ids}
    asignaciones: Dict[str, List[dict]] = {did: [] for did in depot_ids}

    for client in clients:
        cid = client["id"]
        vol = _client_volume(client)
        dists = sorted(
            (dist_matrix.get((did, cid), dist_matrix.get((cid, did), float("inf"))), did)
            for did in depot_ids
        )

        assigned = False
        for threshold in (0.80, 0.95):
            for _, did in dists:
                if depot_vol_used[did] + vol <= depot_cap[did] * threshold:
                    asignaciones[did].append(client)
                    depot_vol_used[did] += vol
                    assigned = True
                    break
            if assigned:
                break

        if not assigned:
            asignaciones[dists[0][1]].append(client)

    return asignaciones


def _solve_sub_vrp(
    depot: dict,
    clients: List[dict],
    vehicles: List[Dict[str, str]],
    dist_matrix: Dict[Tuple[str, str], float],
    time_limit: int = 30,
) -> dict:
    """Fase 2: resuelve un CVRP para un depósito concreto usando OR-Tools Routing."""
    if not clients:
        return {"status": "optimal", "objective_km": 0.0, "routes": {}, "occupancy": {}}

    did = depot["id"]
    nodes = [did] + [c["id"] for c in clients]
    n_nodes = len(nodes)
    n_vehicles = len(vehicles)

    # Matriz de distancias (Enteros escalados)
    dist = [[0] * n_nodes for _ in range(n_nodes)]
    for i in range(n_nodes):
        for j in range(n_nodes):
            if i == j:
                continue
            key = (nodes[i], nodes[j])
            alt = (nodes[j], nodes[i])
            dist[i][j] = int(round(
                dist_matrix.get(key, dist_matrix.get(alt, 999_999.0)) * _SCALE
            ))

    # Demandas y capacidades (Volumen escalado)
    demands = [0] + [int(round(_client_volume(c) * _VOL_SCALE)) for c in clients]
    vehicle_caps = [int(round(CAP[v["type"]] * _VOL_SCALE)) for v in vehicles]

    manager = pywrapcp.RoutingIndexManager(n_nodes, n_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return dist[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_cb = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

    def demand_callback(from_index):
        return demands[manager.IndexToNode(from_index)]

    demand_cb = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(demand_cb, 0, vehicle_caps, True, "Capacity")

    for v_idx in range(n_vehicles):
        routing.SetFixedCostOfVehicle(0, v_idx)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = max(1, time_limit)

    solution = routing.SolveWithParameters(search_params)

    if not solution:
        return {"status": "infeasible", "objective_km": None, "routes": {}, "occupancy": {}}

    routes: Dict[str, List[str]] = {}
    occupancy: Dict[str, float] = {}

    for v_idx in range(n_vehicles):
        index = routing.Start(v_idx)
        route_nodes: List[str] = []
        route_load = 0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route_nodes.append(nodes[node])
            route_load += demands[node]
            index = solution.Value(routing.NextVar(index))
        route_nodes.append(nodes[manager.IndexToNode(index)])

        n_stops = sum(1 for n in route_nodes if n != did)
        if n_stops > 0:
            vid = vehicles[v_idx]["id"]
            routes[vid] = route_nodes
            cap = CAP[vehicles[v_idx]["type"]]
            occupancy[vid] = round((route_load / _VOL_SCALE) / cap, 4)

    return {
        "status": "optimal" if routing.status() == 1 else "feasible",
        "objective_km": round(solution.ObjectiveValue() / _SCALE, 4),
        "routes": routes,
        "occupancy": occupancy,
    }


def _solve_mdvrp(
    depots: List[dict],
    clients: List[dict],
    flota: Dict[str, Dict[str, int]],
    dist_matrix: Dict[Tuple[str, str], float],
    time_limit: int = 60,
) -> dict:
    """Resuelve el MDVRP completo con descomposición en 2 fases."""
    t0 = time.perf_counter()

    depot_clients = _clients_to_depots(depots, clients, flota, dist_matrix)

    all_routes: Dict[str, List[str]] = {}
    all_occupancy: Dict[str, float] = {}
    total_km = 0.0
    worst_status = "optimal"

    active_depots = sum(1 for v in depot_clients.values() if v)
    time_per_depot = max(5, time_limit // max(active_depots, 1))

    for depot in depots:
        did = depot["id"]
        sub_clients = depot_clients[did]
        if not sub_clients:
            continue

        vehicles = _build_vehicles({did: flota[did]})
        sub_result = _solve_sub_vrp(depot, sub_clients, vehicles, dist_matrix,
                                    time_limit=time_per_depot)

        if sub_result["status"] == "infeasible":
            return {
                "status": "infeasible",
                "objective_km": None,
                "vehicles_used": [],
                "routes": {},
                "occupancy": {},
                "solver_time": round(time.perf_counter() - t0, 3),
                "gap": None,
                "detail": (f"Sub-problema del depósito '{did}' es infeasible "
                           f"({len(sub_clients)} clientes, {len(vehicles)} vehículos)."),
            }

        if sub_result["status"] == "feasible":
            worst_status = "feasible"

        all_routes.update(sub_result["routes"])
        all_occupancy.update(sub_result["occupancy"])
        total_km += sub_result["objective_km"] or 0.0

    return {
        "status": worst_status,
        "objective_km": round(total_km, 4),
        "vehicles_used": sorted(all_routes.keys()),
        "routes": all_routes,
        "occupancy": all_occupancy,
        "solver_time": round(time.perf_counter() - t0, 3),
        "gap": 0.0,
    }


# ENDPOINT

@router2.post("/optimize", response_model=VRPResponse, summary="Optimizar rutas - VRP")
def optimize_routes(req: VRPRequest) -> VRPResponse:
    """
    Resuelve el problema de ruteo de vehículos multi-depósito (MDVRP) con flota heterogénea.

    **Flujo interno:**
    1. Valida el input.
    2. Calcula la matriz de distancias Haversine × road_factor entre todos los nodos.
    3. Asigna cada cliente al mejor depósito (Distancia) con capacidad disponible.
    4. Resuelve un CVRP independiente por depósito con OR-Tools (GLS metaheurístico).
    5. Devuelve rutas, ocupación por vehículo, km totales y tiempo de resolución.

    **Tipos de vehículo soportados:** `VAN` (10 m³), `TRUCK` (20 m³).

    **Tamaño de paquetes:** `S` = 0.04 m³ · `M` = 0.20 m³ · `L` = 0.60 m³.
    """
    _validate_request(req)

    # Construir lista de nodos con posiciones para la matriz de distancias
    nodes: List[Dict[str, Any]] = (
        [{"id": d.id, "lat": d.lat, "lng": d.lng} for d in req.depots]
        + [{"id": c.id, "lat": c.lat, "lng": c.lng} for c in req.clients]
    )
    dist_matrix = _build_distance_matrix(nodes, req.road_factor)

    depots_data = [{"id": d.id} for d in req.depots]
    clients_data = [{"id": c.id, "nS": c.nS, "nM": c.nM, "nL": c.nL} for c in req.clients]

    try:
        result = _solve_mdvrp(
            depots=depots_data,
            clients=clients_data,
            flota=req.flota,
            dist_matrix=dist_matrix,
            time_limit=req.time_limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Excepción con en el solver: {exc}") from exc

    return VRPResponse(**result)
