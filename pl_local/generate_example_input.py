"""
generate_example_input.py
=========================
Genera un archivo JSON de ejemplo (ejemplo_entrada.json) con datos
realistas de Madrid para probar el pipeline completo.

  5 depósitos en Madrid
  400 clientes dispersos por la ciudad
  Flota mixta (~60 vehículos)

Ejecutar:
  python generate_example_input.py
"""

import json
import math
import os
import random

SEED = 2026
NUM_CLIENTS = 400


def main():
    rng = random.Random(SEED)

    # ── 5 depósitos reales en Madrid ──
    depots = [
        {"id": "D1", "lat": 40.4530, "lng": -3.6883, "desc": "Hub Chamartín"},
        {"id": "D2", "lat": 40.3920, "lng": -3.7000, "desc": "Hub Usera"},
        {"id": "D3", "lat": 40.4200, "lng": -3.7500, "desc": "Hub Moncloa"},
        {"id": "D4", "lat": 40.4300, "lng": -3.6500, "desc": "Hub Salamanca"},
        {"id": "D5", "lat": 40.4168, "lng": -3.7038, "desc": "Hub Sol (Centro)"},
    ]

    # ── flota heterogénea: ~60 vehículos ──
    fleet = {
        "D1": {"VAN": 6, "TRUCK": 5},
        "D2": {"VAN": 6, "TRUCK": 5},
        "D3": {"VAN": 6, "TRUCK": 5},
        "D4": {"VAN": 6, "TRUCK": 5},
        "D5": {"VAN": 8, "TRUCK": 7},
    }

    # ── 400 clientes dispersos por Madrid ──
    # Bounding box aproximado de Madrid ciudad:
    #   lat: 40.38 – 40.47   (aprox 10 km norte-sur)
    #   lng: -3.77 – -3.63   (aprox 11 km este-oeste)
    LAT_MIN, LAT_MAX = 40.380, 40.470
    LNG_MIN, LNG_MAX = -3.770, -3.630

    clients = []
    for i in range(1, NUM_CLIENTS + 1):
        lat = rng.uniform(LAT_MIN, LAT_MAX)
        lng = rng.uniform(LNG_MIN, LNG_MAX)

        roll = rng.random()
        if roll < 0.40:       # solo small (ecommerce)
            nS = rng.randint(1, 15)
            nM, nL = 0, 0
        elif roll < 0.65:     # small + medium (oficinas)
            nS = rng.randint(1, 8)
            nM = rng.randint(1, 5)
            nL = 0
        elif roll < 0.85:     # medium + large (comercios)
            nS = rng.randint(0, 3)
            nM = rng.randint(2, 6)
            nL = rng.randint(1, 3)
        else:                 # grandes (muebles, electrodomésticos)
            nS = 0
            nM = rng.randint(0, 2)
            nL = rng.randint(1, 4)

        clients.append({
            "id": f"C{i}",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "nS": nS,
            "nM": nM,
            "nL": nL,
        })

    data = {
        "depots": depots,
        "fleet": fleet,
        "clients": clients,
        "time_limit": 60,
        "road_factor": 1.3,
    }

    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "ejemplo_entrada.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓  Archivo generado: {out_path}")
    print(f"   Depósitos: {len(depots)}")
    print(f"   Clientes:  {len(clients)}")
    print(f"   Vehículos: {sum(cnt for d in fleet.values() for cnt in d.values())}")


if __name__ == "__main__":
    main()
