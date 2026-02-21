import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { TrendingUp, Loader2, MapPin, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '@/config/api';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const purpleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Hangzhou center
const HANGZHOU_CENTER = [30.2741, 120.1551];

function MapClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

const DemandaPrediccionPage = () => {
  const { toast } = useToast();

  // Historial inputs (7 days minimum)
  const [historial, setHistorial] = useState(['', '', '', '', '', '', '']);
  const [daySemana, setDaySemana] = useState(0);

  // GPS mode
  const [useGPS, setUseGPS] = useState(false);
  const [gpsPoint, setGpsPoint] = useState(null);

  // Results
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleHistorialChange = (index, value) => {
    const newHist = [...historial];
    newHist[index] = value;
    setHistorial(newHist);
  };

  const addHistorialDay = () => {
    setHistorial([...historial, '']);
  };

  const removeHistorialDay = () => {
    if (historial.length > 7) {
      setHistorial(historial.slice(0, -1));
    }
  };

  const handleMapClick = useCallback((latlng) => {
    setGpsPoint({ lat: latlng.lat, lng: latlng.lng });
    setResult(null);
  }, []);

  const handlePredict = async () => {
    // Validate historial
    const historialNums = historial.map((v) => parseInt(v));
    if (historialNums.some((v) => isNaN(v) || v < 0)) {
      toast({ title: 'Historial inválido', description: 'Todos los valores del historial deben ser números enteros >= 0.' });
      return;
    }

    if (useGPS && !gpsPoint) {
      toast({ title: 'Punto GPS requerido', description: 'Haz clic en el mapa de Hangzhou para seleccionar un punto.' });
      return;
    }

    setLoading(true);
    try {
      let endpoint, body;

      if (useGPS && gpsPoint) {
        endpoint = API.ML_PREDICT_GPS;
        body = {
          historial: historialNums,
          day_semana: daySemana,
          lat: gpsPoint.lat,
          lng: gpsPoint.lng,
        };
      } else {
        endpoint = API.ML_PREDECIR_ZONA;
        body = {
          historial: historialNums,
          day_semana: daySemana,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHistorial(['', '', '', '', '', '', '']);
    setDaySemana(0);
    setGpsPoint(null);
    setResult(null);
  };

  const handleLoadExample = () => {
    setHistorial(['12', '8', '15', '10', '14', '9', '11']);
    setDaySemana(0);
    toast({ title: 'Ejemplo cargado', description: 'Datos de ejemplo listos para predecir.' });
  };

  return (
    <>
      <Helmet>
        <title>Predicción de Demanda - S&O Logística</title>
        <meta name="description" content="Predicción de demanda con LightGBM. MAE 1.75 para optimización de última milla en Hangzhou." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 page-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-darkGray">Predicción de Demanda</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                LightGBM · MAE 1.75 · Hangzhou · H3
              </span>
            </div>
            <p className="text-lg text-gray-600">
              Last Mile Intelligence — Predice pedidos para una zona H3 a partir de datos históricos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Input panel */}
            <div className="space-y-6">
              {/* Historial */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-darkGray">Historial de pedidos</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={removeHistorialDay}
                      disabled={historial.length <= 7}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      - Día
                    </button>
                    <button
                      onClick={addHistorialDay}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:border-green-300 hover:text-green-500"
                    >
                      + Día
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Introduce los pedidos de los últimos {historial.length} días (mínimo 7). El último valor es el día más reciente.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {historial.map((val, i) => (
                    <div key={i}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Día -{historial.length - i}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => handleHistorialChange(i, e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow focus:border-transparent text-darkGray bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Day selector */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-darkGray mb-4">Día a predecir</h2>
                <div className="grid grid-cols-7 gap-2">
                  {DIAS.map((dia, i) => (
                    <button
                      key={i}
                      onClick={() => setDaySemana(i)}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        daySemana === i
                          ? 'bg-yellow text-darkGray shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {DIAS_SHORT[i]}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Seleccionado: <strong>{DIAS[daySemana]}</strong>
                </p>
              </div>

              {/* GPS toggle */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
                  <input
                    type="checkbox"
                    checked={useGPS}
                    onChange={(e) => {
                      setUseGPS(e.target.checked);
                      setGpsPoint(null);
                      setResult(null);
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-yellow focus:ring-yellow accent-yellow"
                  />
                  <span className="font-medium text-darkGray">Predecir por posición GPS (mapa de Hangzhou)</span>
                </label>
                <p className="text-sm text-gray-500">
                  {useGPS
                    ? 'Haz clic en el mapa para seleccionar una posición. Se resolverá la celda H3 automáticamente.'
                    : 'Solo con historial y día de la semana (predicción general).'}
                </p>
                {useGPS && gpsPoint && (
                  <p className="text-sm text-purple-600 mt-2 font-medium">
                    <MapPin size={14} className="inline mr-1" />
                    {gpsPoint.lat.toFixed(4)}, {gpsPoint.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleLoadExample} variant="outline" className="py-5 rounded-xl border-gray-300 hover:border-yellow">
                  Cargar ejemplo
                </Button>
                <Button
                  onClick={handlePredict}
                  disabled={loading}
                  className="flex-1 bg-yellow hover:bg-yellow/90 text-darkGray font-semibold py-5 text-base rounded-xl"
                >
                  {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                  {loading ? 'Prediciendo...' : 'Predecir'}
                </Button>
                <Button onClick={handleReset} variant="outline" className="py-5 rounded-xl border-gray-300">
                  <RotateCcw size={18} />
                </Button>
              </div>
            </div>

            {/* Right: Map + Results */}
            <div className="space-y-6">
              {/* Map (shown when GPS mode is on, but always visible for context) */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-darkGray text-sm">
                    {useGPS ? 'Haz clic para seleccionar posición' : 'Mapa de Hangzhou (modo GPS desactivado)'}
                  </h3>
                </div>
                <div style={{ height: '400px' }} className={!useGPS ? 'opacity-50 pointer-events-none' : ''}>
                  <MapContainer center={HANGZHOU_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {useGPS && <MapClickHandler onClick={handleMapClick} />}
                    {gpsPoint && (
                      <Marker position={[gpsPoint.lat, gpsPoint.lng]} icon={purpleIcon}>
                        <Popup>
                          {gpsPoint.lat.toFixed(4)}, {gpsPoint.lng.toFixed(4)}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Results */}
              {result && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-purple-600" size={22} />
                    <h2 className="text-xl font-bold text-darkGray">Resultado de predicción</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Pedidos esperados</span>
                      <span className="text-4xl font-bold text-yellow">{result.pedidos_esperados}</span>
                    </div>

                    <div className="border-b border-gray-100 pb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Día</span>
                      <span className="text-lg font-semibold text-darkGray">{result.dia}</span>
                    </div>

                    {result.h3_cell && (
                      <div className="border-b border-gray-100 pb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Celda H3 (res. 8)</span>
                        <span className="text-sm font-mono font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {result.h3_cell}
                        </span>
                      </div>
                    )}

                    {result.lat != null && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Posición</span>
                        <span className="text-sm text-darkGray">
                          {result.lat?.toFixed(4)}, {result.lng?.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-semibold text-darkGray mb-1 text-sm">Modelo LightGBM</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Entrenado sobre datos de pedidos de Hangzhou con celdas H3 (resolución 8, ~460 m²).
                  Features: lag_1, lag_2, lag_3, lag_7, average_wk, day_of_wk. MAE de validación: 1.75 pedidos.
                  El modelo aprende un patrón temporal universal aplicable a cualquier zona.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemandaPrediccionPage;
