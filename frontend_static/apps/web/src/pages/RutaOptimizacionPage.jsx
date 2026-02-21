import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { MapPin, Navigation, Clock, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '@/config/api';
import poisData from '@/data/pois.json';

// Fix Leaflet default marker icons for Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
const makeIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const greenIcon = makeIcon('green');
const redIcon = makeIcon('red');
const blueIcon = makeIcon('blue');
const orangeIcon = makeIcon('orange');
const violetIcon = makeIcon('violet');

const POI_ICONS = { seaport: blueIcon, airport: violetIcon, border: orangeIcon };

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

const RutaOptimizacionPage = () => {
  const { toast } = useToast();
  const [sourcePoint, setSourcePoint] = useState(null);
  const [targetPoint, setTargetPoint] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState('');
  const [usePOI, setUsePOI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);

  const handleMapClick = useCallback(
    (latlng) => {
      if (usePOI) {
        setSourcePoint({ lat: latlng.lat, lon: latlng.lng });
        setResults(null);
        setRouteGeometry([]);
      } else {
        if (!sourcePoint) {
          setSourcePoint({ lat: latlng.lat, lon: latlng.lng });
        } else if (!targetPoint) {
          setTargetPoint({ lat: latlng.lat, lon: latlng.lng });
        } else {
          setSourcePoint({ lat: latlng.lat, lon: latlng.lng });
          setTargetPoint(null);
          setResults(null);
          setRouteGeometry([]);
        }
      }
    },
    [sourcePoint, targetPoint, usePOI],
  );

  const handleSearch = async () => {
    let src, tgt;

    if (usePOI) {
      if (!sourcePoint) {
        toast({ title: 'Origen requerido', description: 'Haz clic en el mapa para seleccionar el punto de origen.' });
        return;
      }
      if (!selectedPOI) {
        toast({ title: 'POI requerido', description: 'Selecciona un punto de importación/exportación.' });
        return;
      }
      const poi = poisData.pois.find((p) => p.id === parseInt(selectedPOI));
      src = sourcePoint;
      tgt = { lat: poi.lat, lon: poi.lon };
      setTargetPoint(tgt);
    } else {
      if (!sourcePoint || !targetPoint) {
        toast({ title: 'Puntos requeridos', description: 'Haz clic en 2 puntos del mapa para definir origen y destino.' });
        return;
      }
      src = sourcePoint;
      tgt = targetPoint;
    }

    setLoading(true);
    try {
      const url = `${API.SEARCH}?source_lat=${src.lat}&source_lon=${src.lon}&target_lat=${tgt.lat}&target_lon=${tgt.lon}`;
      const response = await fetch(url);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
      if (data.geometry && data.geometry.length > 0) {
        setRouteGeometry(data.geometry.map((g) => [g.lat, g.lon]));
      } else {
        setRouteGeometry([]);
      }
      if (!data.found) {
        toast({ title: 'Sin ruta', description: 'No se encontró un camino entre los puntos seleccionados.' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSourcePoint(null);
    setTargetPoint(null);
    setResults(null);
    setRouteGeometry([]);
    setSelectedPOI('');
  };

  const poiGroups = {
    seaport: poisData.pois.filter((p) => p.type === 'seaport'),
    airport: poisData.pois.filter((p) => p.type === 'airport'),
    border: poisData.pois.filter((p) => p.type === 'border'),
  };

  return (
    <>
      <Helmet>
        <title>Optimización de Ruta - S&O Logística</title>
        <meta name="description" content="Encuentra la ruta óptima en la red vial de EE.UU. con A* Bidireccional sobre 23.9M nodos." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 page-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-darkGray">Optimización de Ruta</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">A* Bidireccional</span>
            </div>
            <p className="text-lg text-gray-600">Red Vial de EE.UU. — 23.9M nodos · Haz clic en el mapa para seleccionar puntos</p>
          </div>

          {/* Mode selector */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={usePOI}
                  onChange={(e) => {
                    setUsePOI(e.target.checked);
                    handleReset();
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-yellow focus:ring-yellow accent-yellow"
                />
                <span className="font-medium text-darkGray">Usar punto de importación/exportación como destino</span>
              </label>

              {usePOI && (
                <select
                  value={selectedPOI}
                  onChange={(e) => setSelectedPOI(e.target.value)}
                  className="flex-1 min-w-[280px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow focus:border-transparent text-darkGray bg-white text-sm"
                >
                  <option value="">-- Selecciona un punto --</option>
                  <optgroup label="Puerto Marítimo">
                    {poiGroups.seaport.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Aeropuerto">
                    {poiGroups.airport.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Frontera">
                    {poiGroups.border.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {usePOI
                ? 'Haz clic en el mapa para definir el origen. El destino será el POI seleccionado.'
                : 'Haz clic en 2 puntos del mapa: primero origen (verde) y luego destino (rojo).'}
            </p>
          </div>

          {/* Map + Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden">
              <div style={{ height: '600px' }}>
                <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} className="z-0">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onClick={handleMapClick} />

                  {sourcePoint && (
                    <Marker position={[sourcePoint.lat, sourcePoint.lon]} icon={greenIcon}>
                      <Popup>Origen: {sourcePoint.lat.toFixed(4)}, {sourcePoint.lon.toFixed(4)}</Popup>
                    </Marker>
                  )}
                  {targetPoint && (
                    <Marker position={[targetPoint.lat, targetPoint.lon]} icon={redIcon}>
                      <Popup>Destino: {targetPoint.lat.toFixed(4)}, {targetPoint.lon.toFixed(4)}</Popup>
                    </Marker>
                  )}

                  {usePOI &&
                    poisData.pois.map((poi) => (
                      <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={POI_ICONS[poi.type] || blueIcon}>
                        <Popup>
                          <strong>{poi.name}</strong><br />
                          {poi.type === 'seaport' ? 'Puerto' : poi.type === 'airport' ? 'Aeropuerto' : 'Frontera'}
                        </Popup>
                      </Marker>
                    ))}

                  {routeGeometry.length > 0 && (
                    <Polyline positions={routeGeometry} pathOptions={{ color: '#FFCC00', weight: 4, opacity: 0.9 }} />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Panel */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <h2 className="text-lg font-bold text-darkGray mb-4">Puntos seleccionados</h2>
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2">
                    <Navigation className="text-green-600 shrink-0" size={18} />
                    <span className="text-sm text-gray-500">Origen:</span>
                    <span className="text-sm font-medium text-darkGray truncate">
                      {sourcePoint ? `${sourcePoint.lat.toFixed(4)}, ${sourcePoint.lon.toFixed(4)}` : 'Clic en mapa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="text-red shrink-0" size={18} />
                    <span className="text-sm text-gray-500">Destino:</span>
                    <span className="text-sm font-medium text-darkGray truncate">
                      {targetPoint
                        ? `${targetPoint.lat.toFixed(4)}, ${targetPoint.lon.toFixed(4)}`
                        : usePOI && selectedPOI
                          ? poisData.pois.find((p) => p.id === parseInt(selectedPOI))?.name
                          : 'Clic en mapa'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSearch}
                    disabled={loading}
                    className="flex-1 bg-yellow hover:bg-yellow/90 text-darkGray font-semibold py-5 rounded-xl"
                  >
                    {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                    {loading ? 'Calculando...' : 'Calcular ruta'}
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="py-5 rounded-xl border-gray-300">
                    <RotateCcw size={18} />
                  </Button>
                </div>
              </div>

              {results && (
                <div className="bg-white rounded-2xl shadow-lg p-5">
                  <h2 className="text-lg font-bold text-darkGray mb-4">Resultados</h2>
                  {results.found ? (
                    <div className="space-y-3">
                      <div className="border-b border-gray-100 pb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Coste total</span>
                        <span className="text-2xl font-bold text-yellow">{results.cost?.toLocaleString()}</span>
                      </div>
                      <div className="border-b border-gray-100 pb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Nodos expandidos</span>
                        <span className="text-lg font-semibold text-darkGray">{results.nodes_expanded?.toLocaleString()}</span>
                      </div>
                      <div className="border-b border-gray-100 pb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Tiempo de ejecución</span>
                        <div className="flex items-center gap-2">
                          <Clock className="text-blue-600" size={16} />
                          <span className="text-lg font-semibold text-darkGray">{results.execution_time_ms} ms</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Nodos en el camino</span>
                        <span className="text-lg font-semibold text-darkGray">{results.path?.length?.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={20} />
                      <span className="text-sm">No se encontró camino entre estos puntos.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-darkGray mb-1 text-sm">Algoritmo A* Bidireccional</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Búsqueda simultánea desde origen y destino en la red vial de EE.UU. (DIMACS). 35-50% menos nodos expandidos que
                  A* unidireccional. Heurística euclídea con criterio de parada de Ira Pohl.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RutaOptimizacionPage;
