"""test.py – Pipeline: JSON -> meteo -> minimizar combustible -> ahorro -> JSON."""

import json
import os
import sys

from build_problem import build_data_from_file, AIRPORTS, FRANJAS
from solver import solve_flights


def main():
    _dir = os.path.dirname(os.path.abspath(__file__))
    input_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(_dir, "ejemplo_entrada.json")

    print("=" * 72)
    print("  AVIONES DHL – Minimizacion de combustible por franja horaria")
    print("=" * 72)

    # ── PASO 1: meteo ──
    print("\n--- PASO 1: Generando condiciones meteorologicas ---")
    data = build_data_from_file(input_path)
    meteo = data["meteo"]

    print(f"\n  {'Aeropuerto':<20} {'Franja':<10} {'Viento':>7} {'Vis.km':>7} "
          f"{'Lluvia':>7} {'Torment':>8} {'Niebla':>7} {'Extra':>7}")
    print("  " + "-" * 76)
    for code in sorted(meteo):
        nombre = AIRPORTS[code][0]
        for fr in FRANJAS:
            wx = meteo[code][fr]
            pct = wx['pct_extra'] * 100
            print(f"  {code + ' ' + nombre:<20} {fr:<10} "
                  f"{wx['viento_kt']:>5}kt "
                  f"{wx['visibilidad_km']:>6.1f} "
                  f"{'  SI' if wx['lluvia'] else '  no':>7} "
                  f"{'  SI' if wx['tormenta'] else '  no':>8} "
                  f"{'  SI' if wx['niebla'] else '  no':>7} "
                  f"{'+' + f'{pct:.1f}' + '%':>7}")
        print("  " + "-" * 76)

    # ── PASO 2: minimizar combustible ──
    print("\n--- PASO 2: Minimizando consumo de combustible ---")
    result = solve_flights(data)

    print(f"\n  {'ID':<5} {'Ruta':<14} {'Dist':>6} {'Base kg':>9} "
          f"{'Mejor':>8} {'Fuel kg':>9} {'Peor kg':>9} {'Ahorro':>9}")
    print("  " + "-" * 78)
    for v in result["vuelos"]:
        ruta = f"{v['origen']}->{v['destino']}"
        print(f"  {v['vuelo_id']:<5} {ruta:<14} {v['dist_km']:>5.0f}km "
              f"{v['fuel_base_kg']:>8.0f}kg "
              f"{v['mejor_franja']:>8} "
              f"{v['fuel_mejor_kg']:>8.0f}kg "
              f"{v['fuel_peor_kg']:>8.0f}kg "
              f"{v['ahorro_kg']:>8.0f}kg")

    # ── Detalle por vuelo ──
    print("\n--- Detalle de consumo por franja ---")
    for v in result["vuelos"]:
        print(f"  {v['vuelo_id']} {v['origen']}->{v['destino']}  "
              f"(base {v['fuel_base_kg']:.0f} kg)")
        for o in v["detalle_por_franja"]:
            marca = " <<< MEJOR" if o["franja"] == v["mejor_franja"] else ""
            motivos = ", ".join(o["motivos"])
            print(f"      {o['franja']:<8}  {o['fuel_kg']:>7.0f} kg  "
                  f"(+{o['extra_kg']:.0f} kg, +{o['pct_extra_total']:.1f}%)  "
                  f"{motivos}{marca}")

    # ── Resumen de ahorro ──
    r = result["resumen"]
    print("\n" + "=" * 72)
    print("  RESUMEN DE AHORRO DE COMBUSTIBLE")
    print("=" * 72)
    print(f"  Combustible optimo (mejor franja) : {r['fuel_total_optimo_kg']:>10,.0f} kg")
    print(f"  Combustible peor   (peor franja)  : {r['fuel_total_peor_kg']:>10,.0f} kg")
    print(f"  AHORRO TOTAL                      : {r['ahorro_total_kg']:>10,.0f} kg  ({r['ahorro_total_pct']:.2f}%)")
    print(f"  Equivalente en toneladas           : {r['ahorro_total_kg']/1000:>10.2f} t")
    print("=" * 72)

    # ── Guardar ──
    out = os.path.join(_dir, "resultado_test.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\n  Resultado guardado en: {out}")


if __name__ == "__main__":
    main()
