# Idea Hackathon_URJC Fase 1

Documentación inicial

## Reto: Logística por DHL

Optimizar la cadena de suministro en base a la sostenibilidad, generando oportunidades:

Se plantea un backend con FastAPI, Uvicorn y Pydantic en Render que tenga 3 servicios principales:

    - Búsqueda optimizada mediante Bidirectional A* (Road) para importaciones y exportaciones en USA (Ejemplo DIMAC), entre un punto determinado de exportación o importación por mar o aire y un punto determinado que se ajustará a los disponibles en el mapa para hacer los cambios.

    - Programación lineal útil para cualquier trabajador de sucursal o directivo sin conocimientos en el ámbito, que dado determinados datos, optimice el número de trayectos que se deben hacer.

    - Aprendizaje automático para determinar zonas con mayor densidad de recibos de paquetes día a día y así optimizar los envíos en cualquier plazo, ya sea para una organización directa o para elegir ubicaciones para nuevas sucursales/almacenes de la empresa.

El frontend se planea hacer de forma completa en Hostinger, pero por si acaso, se creará otro estático para Render o Netlify.
