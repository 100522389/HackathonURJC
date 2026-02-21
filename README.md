# Idea Hackathon_URJC Fase 1

Documentación inicial

## Reto: Logística por DHL

Optimizar la cadena de suministro en base a la sostenibilidad, generando oportunidades:

Se plantea un backend con FastAPI, Uvicorn y Pydantic en Microsoft Azure que tenga 3 servicios principales:

    - Búsqueda optimizada mediante Bidirectional A* (Road) para importaciones y exportaciones en USA (Ejemplo DIMAC), entre un punto determinado de exportación o importación por mar o aire y un punto determinado que se ajustará a los disponibles en el mapa para hacer los cambios.
    Oportunidad: Coste de sostenibilidad (Energía) en las redes viales que son las rutas menos optimizadas a diferencia de las marítimas y aéreas

    - Programación lineal útil para cualquier trabajador de sucursal o directivo sin conocimientos en el ámbito, que dado determinados datos, optimice el número de trayectos que se deben hacer.
    Oportunidad: Optimiza el número de trayectos a realizar, es decir los paquetes entregados y su eficacia a través de datos relevantes.

    - Aprendizaje automático para determinar zonas con mayor densidad de recibos de paquetes día a día y así optimizar los envíos en cualquier plazo, ya sea para una organización directa o para elegir ubicaciones para nuevas sucursales/almacenes de la empresa.
    Predecir: nº pedidos en celda H3 en día t+1
    Oportunidad: Last mile, puedes obtener la densidad de paquetes en cada zona para el día siguiente o incluso el mes siguiente...

El frontend se planea hacer de forma completa en Hostinger, pero por si acaso, se creará otro estático para Microsoft Azure/Netlify.

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

### Servicio 2

### Servicio 3

**Pipeline (Laboratorio):**

    - Datos brutos de pedidos (Posición y fecha de aceptación como mínimo)
    - Convertimos posición a zonas (celdas H3)
    - Agregamos por día
    - Creamos memoria temporal (lags)
    - Entrenamos LightGBM
    - Validamos respecto a tiempo
    - Ajuste de hiperparámetros
    - Obtenemos el modelo final

**Resultados de entrenamiento**
    1.75 MAE, es decir, se equivoca en promedio menos de 2 pedidos por zona - 460 m^2 (H3)

**Qué ofrece el modelo:**

    - Asignar repartidores con antelación a las zonas con más carga
    - Planificar rutas antes de tener los pedidos reales
    - Redistribuir recursos entre zonas según la demanda esperada (Last mile...)

**Funcionalidad:**

    El modelo aprende un patrón temporal universal: "si ayer hubo X pedidos, mañana habrá Y". La zona queda implícita en el historial que se le pasa. (Modelo: Hanzhou)
