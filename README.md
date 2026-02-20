# Idea Hackathon_URJC Fase 1

Documentación inicial

## Reto: Logística por DHL

Optimizar la cadena de suministro en base a la sostenibilidad, generando oportunidades:

Se plantea un backend con FastAPI, Uvicorn y Pydantic en Render que tenga 3 servicios principales:

    - Búsqueda optimizada mediante Bidirectional A* (Road) para importaciones y exportaciones en USA (Ejemplo DIMAC), entre un punto determinado de exportación o importación por mar o aire y un punto determinado que se ajustará a los disponibles en el mapa para hacer los cambios.

    - Programación lineal útil para cualquier trabajador de sucursal o directivo sin conocimientos en el ámbito, que dado determinados datos, optimice el número de trayectos que se deben hacer.

    - Aprendizaje automático para determinar zonas con mayor densidad de recibos de paquetes día a día y así optimizar los envíos en cualquier plazo, ya sea para una organización directa o para elegir ubicaciones para nuevas sucursales/almacenes de la empresa.

El frontend se planea hacer de forma completa en Hostinger, pero por si acaso, se creará otro estático para Render o Netlify.

### Servicio 1

    Implementación de algoritmos de búsqueda para encontrar caminos óptimos en redes viales reales utilizando grafos DIMAC de los Estados Unidos.

**Algoritmos implementados:**

Dijkstra (Fuerza Bruta)

- Sin heurística (h(n) = 0)
- Expande nodos uniformemente
- Usado como referencia para comparaciones

Astar

- Función de evaluación: f(n) = g(n) + h(n)
- Búsqueda dirigida hacia el objetivo
- Garantía de optimalidad con heurísticas admisibles

Astar (Bidirectional)

- Búsqueda simultánea desde origen y destino
- Criterio de parada de Ira Pohl
- Nodos expandidos mínimos...
- Balance de heurísticas (división por 2) para garantizar optimalidad

**Heurísticas implementadas:**

- Distancia Geodésica (Haversine): Considera la curvatura terrestre
- Distancia Euclídea: Por plano

**Resultados experimentales:**

Nodos expandidos respecto a Dijkstra:

- A*: 10-12% de reducción promedio
- A* Bidireccional: 35-50% de reducción promedio, hasta 85% en casos óptimos

Tiempo de ejecución:

- A* Bidireccional Euclídeo: factor de aceleración 1.15x promedio, hasta 5.6x en casos óptimos
- Instancia máxima: USA completo con 23.9M nodos, 58.3M aristas

Para la medición de tiempos es necesario estandarizar el equipo a utilizar...

**Estructuras de datos:**

- Grafo con listas de adyacencia: O(|V| + |E|)
- Cola de prioridad (min-heap) para lista abierta
- Vector T/F para nodos expandidos
- Vectores auxiliares para distancias, además de predecesores

**Pruebas automatizadas:**

Se recomienda descargar todos los mapas:

    ```bash
    python test.py        # Pruebas en todas las instancias disponibles
    python MAX10.py       # Pruebas en instancia USA completa
    ```

Instancias disponibles en [9th DIMAC Challenge](http://www.diag.uniroma1.it/challenge9/).

**Análisis y resultados de búsqueda:**

- A* (Bidirectional) con distancia euclídea es la configuración óptima (Haversine también disponible)
- Descenso consistente de 35-50% en nodos expandidos respecto a A*
- Escalabilidad comprobada hasta 23.9M de nodos
- Optimalidad garantizada mediante criterio de Ira Pohl y balance de heurísticas completo
