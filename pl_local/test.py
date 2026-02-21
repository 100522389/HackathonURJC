"""
test.py  –  Pruebas locales solver MDVRP  (Pipeline completa)
=====================================================================
Ejecutar:   python test.py
         o: python test.py ruta/al/input.json

Lee un archivo JSON de entrada con depósitos (lat/lng), flota y clientes,
calcula la matriz de distancias con Haversine, y resuelve el problema
con OR-Tools.

Si no se pasa argumento, usa 'ejemplo_entrada.json' (generado por
generate_example_input.py).
"""

import json
import os
import sys
import time
from collections import Counter
from build_problem import build_data_from_file
from pl_local.solver import solve_mdvrp


DEFAULT_INPUT = "ejemplo_entrada.json"


def _print_input_stats(data: dict):
    """Imprime estadísticas del input para entender la escala."""
    n_dep = len(data["depots"])
    n_cli = len(data["clients"])
    n_veh = sum(cnt for d in data["fleet"].values() for cnt in d.values())
    n_van = sum(d.get("VAN", 0) for d in data["fleet"].values())
    n_truck = sum(d.get("TRUCK", 0) for d in data["fleet"].values())
    total_arcs = len(data["dist_matrix"])

    # Volumen total demandado
    vol_total = 0
    for c in data["clients"]:
        vol_total += 0.04 * c["nS"] + 0.20 * c["nM"] + 0.60 * c["nL"]

    # Capacidad total flota
    cap_total = n_van * 10.0 + n_truck * 20.0

    print(f"  Depósitos        : {n_dep}")
    print(f"  Clientes         : {n_cli}")
    print(f"  Vehículos totales: {n_veh}  ({n_van} VANs × 10 m³  +  {n_truck} TRUCKs × 20 m³)")
    print(f"  Capacidad total  : {cap_total:.1f} m³")
    print(f"  Volumen demandado: {vol_total:.2f} m³  ({vol_total/cap_total*100:.1f}% de capacidad)")
    print(f"  Distancias       : {total_arcs} pares")
    print(f"  Time limit       : {data['time_limit']}s")


def main():
    # ── determinar archivo de entrada ──
    _dir = os.path.dirname(os.path.abspath(__file__))
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
    else:
        input_path = os.path.join(_dir, DEFAULT_INPUT)

    if not os.path.isfile(input_path):
        print(f"✗  Archivo no encontrado: {input_path}")
        sys.exit(1)

    print("=" * 65)
    print("  PIPELINE VRP  –  Archivo → Distancias → Solver")
    print("=" * 65)
    print(f"  Archivo de entrada: {input_path}")
    print()

    # ── PASO 1: Leer JSON + construir matriz de distancias ──
    print("─── PASO 1: Construyendo matriz de distancias ───")
    t_build = time.perf_counter()
    data = build_data_from_file(input_path)
    t_build = round(time.perf_counter() - t_build, 2)
    print(f"  Tiempo de construcción: {t_build}s")
    print()

    _print_input_stats(data)

    print()
    print("─── PASO 2: Resolviendo VRP ───")
    print(f"  (puede tardar hasta {data['time_limit']}s)")
    print()

    t0 = time.perf_counter()
    result = solve_mdvrp(data)
    wall_time = round(time.perf_counter() - t0, 2)

    # ─── resultado ────
    print("═" * 65)
    print("  RESULTADO")
    print("═" * 65)
    print(f"  Status           : {result['status']}")
    print(f"  Objetivo (km)    : {result['objective_km']}")
    print(f"  Vehículos usados : {len(result['vehicles_used'])} de "
          f"{sum(cnt for d in data['fleet'].values() for cnt in d.values())}")
    print(f"  Tiempo solver    : {result['solver_time']}s  (wall: {wall_time}s)")
    print(f"  Gap              : {result['gap']}")
    print()

    # ─── rutas ────
    print("─── RUTAS ───")
    total_stops = 0
    for vid in sorted(result["routes"].keys()):
        route = result["routes"][vid]
        oc = result["occupancy"].get(vid, "?")
        n_stops = len([n for n in route if n.startswith("C")])
        total_stops += n_stops
        # Truncar rutas largas para que se lea bien
        if len(route) > 12:
            route_str = " → ".join(route[:6]) + " → ... → " + " → ".join(route[-3:])
        else:
            route_str = " → ".join(route)
        print(f"  {vid:22s}  [{n_stops:2d} paradas]  occ: {oc:.0%}  →  {route_str}")
    print()

    occs = list(result["occupancy"].values())
    if occs:
        avg_occ = sum(occs) / len(occs)
        min_occ = min(occs)
        max_occ = max(occs)
        print(f"  Ocupación media  : {avg_occ:.0%}")
        print(f"  Ocupación mínima : {min_occ:.0%}")
        print(f"  Ocupación máxima : {max_occ:.0%}")
        print(f"  Total paradas    : {total_stops}")
        print()

    print("─── VALIDACIONES ───")
    errors = []

    if result["status"] not in ("optimal", "feasible"):
        errors.append(f"Estado inesperado: {result['status']}")

    # Cada cliente servido exactamente una vez
    served = []
    for vid, route in result["routes"].items():
        served.extend([n for n in route if n.startswith("C")])

    client_ids = {c["id"] for c in data["clients"]}
    if set(served) != client_ids:
        missing = client_ids - set(served)
        extra = set(served) - client_ids
        if missing:
            errors.append(f"Clientes NO servidos: {missing}")
        if extra:
            errors.append(f"Nodos extra en rutas: {extra}")

    dupes = {k: v for k, v in Counter(served).items() if v > 1}
    if dupes:
        errors.append(f"Clientes duplicados en rutas: {dupes}")

    # Cada ruta empieza y termina en su depósito
    for vid, route in result["routes"].items():
        dep = vid.split("_")[0]
        if not route or route[0] != dep or route[-1] != dep:
            errors.append(f"Ruta {vid} no empieza/termina en {dep}: {route}")

    # Ocupación ≤ 100 %
    for vid, oc in result["occupancy"].items():
        if oc > 1.001:
            errors.append(f"Vehículo {vid} sobrecargado: {oc:.2%}")

    if errors:
        print("  EXCEPCIONES:")
        for e in errors:
            print(f"    - {e}")
    else:
        print("  Todas las validaciones pasaron correctamente.")

    print()
    _dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(_dir, "resultado_test.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"Resultado guardado en: {output_file}")


if __name__ == "__main__":
    main()
