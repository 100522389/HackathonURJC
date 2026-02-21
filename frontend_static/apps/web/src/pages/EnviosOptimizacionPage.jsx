import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Truck, Plane, Upload, FileJson, Loader2, MapPin, Package, Clock, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import API from '@/config/api';

// ── Ejemplos descargables ──────────────────────────────────────────────────────

const VRP_EXAMPLE = {
  depots: [
    { id: 'D1', lat: 40.4168, lng: -3.7038, desc: 'Madrid' },
    { id: 'D2', lat: 41.3851, lng: 2.1734, desc: 'Barcelona' },
  ],
  flota: {
    D1: { VAN: 3, TRUCK: 2 },
    D2: { VAN: 2, TRUCK: 1 },
  },
  clients: [
    { id: 'C1', lat: 40.453, lng: -3.688, nS: 10, nM: 3, nL: 1 },
    { id: 'C2', lat: 40.430, lng: -3.710, nS: 5, nM: 2, nL: 0 },
    { id: 'C3', lat: 41.390, lng: 2.160, nS: 8, nM: 0, nL: 2 },
    { id: 'C4', lat: 41.400, lng: 2.180, nS: 3, nM: 4, nL: 1 },
    { id: 'C5', lat: 40.470, lng: -3.650, nS: 6, nM: 1, nL: 0 },
    { id: 'C6', lat: 41.370, lng: 2.150, nS: 12, nM: 2, nL: 1 },
  ],
  time_limit: 30,
  road_factor: 1.3,
};

const TRANSFER_EXAMPLE = {
  vuelos: [
    { id: 'V1', origen: 'LEJ', destino: 'MAD' },
    { id: 'V2', origen: 'LEJ', destino: 'BCN' },
    { id: 'V3', origen: 'CDG', destino: 'FRA' },
    { id: 'V4', origen: 'LEJ', destino: 'MXP' },
    { id: 'V5', origen: 'BRU', destino: 'LIS' },
  ],
  weather_seed: 42,
};

const AIRPORTS_INFO = {
  LEJ: 'Leipzig', CDG: 'Paris-CDG', FRA: 'Frankfurt', MAD: 'Madrid',
  BCN: 'Barcelona', BRU: 'Bruselas', EMA: 'East Midlands', LIS: 'Lisboa',
  MXP: 'Milan-Malpensa', VIE: 'Viena',
};

const EnviosOptimizacionPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Tab: 'vrp' or 'transfer'
  const [activeTab, setActiveTab] = useState('vrp');
  const [jsonContent, setJsonContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonContent(ev.target.result);
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleLoadExample = () => {
    const example = activeTab === 'vrp' ? VRP_EXAMPLE : TRANSFER_EXAMPLE;
    setJsonContent(JSON.stringify(example, null, 2));
    setFileName(`ejemplo_${activeTab}.json`);
    setResults(null);
    toast({ title: 'Ejemplo cargado', description: `JSON de ejemplo para ${activeTab === 'vrp' ? 'camiones' : 'aviones'} listo.` });
  };

  const handleDownloadExample = () => {
    const example = activeTab === 'vrp' ? VRP_EXAMPLE : TRANSFER_EXAMPLE;
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejemplo_${activeTab}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOptimize = async () => {
    if (!jsonContent.trim()) {
      toast({ title: 'JSON requerido', description: 'Sube un archivo JSON o carga un ejemplo.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      toast({ title: 'JSON inválido', description: 'El archivo no contiene JSON válido.' });
      return;
    }

    const endpoint = activeTab === 'vrp' ? API.PL_OPTIMIZE : API.PL_TRANSFER;

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
      toast({ title: 'Optimización completada', description: 'Los resultados están listos.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Render VRP results ──
  const renderVRPResults = () => {
    if (!results) return null;
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Estado</span>
              <Package className="text-purple-600" size={18} />
            </div>
            <div className={`text-xl font-bold ${results.status === 'optimal' ? 'text-green-600' : results.status === 'infeasible' ? 'text-red-600' : 'text-yellow-600'}`}>
              {results.status === 'optimal' ? 'Óptimo' : results.status === 'infeasible' ? 'Infeasible' : 'Factible'}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Distancia Total</span>
              <MapPin className="text-blue-600" size={18} />
            </div>
            <div className="text-xl font-bold text-yellow">{results.objective_km != null ? `${results.objective_km} km` : '—'}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Vehículos</span>
              <Truck className="text-green-600" size={18} />
            </div>
            <div className="text-xl font-bold text-yellow">{results.vehicles_used?.length || 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Tiempo Solver</span>
              <Clock className="text-orange-600" size={18} />
            </div>
            <div className="text-xl font-bold text-yellow">{results.solver_time != null ? `${results.solver_time} s` : '—'}</div>
          </div>
        </div>

        {results.detail && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-700">{results.detail}</p>
          </div>
        )}

        {/* Vehicle routes */}
        {results.routes && Object.keys(results.routes).length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-darkGray mb-4">Rutas de vehículos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(results.routes).map(([vid, route]) => (
                <div key={vid} className="bg-white rounded-xl shadow-lg p-5 card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {vid.includes('TRUCK') ? <Truck className="text-blue-600" size={20} /> : <Package className="text-green-600" size={20} />}
                      <span className="font-bold text-darkGray">{vid}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-yellow/20 text-yellow-700 font-semibold rounded-full text-xs">
                      {vid.includes('TRUCK') ? 'TRUCK' : 'VAN'}
                    </span>
                  </div>
                  {results.occupancy?.[vid] != null && (
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">Ocupación</span>
                        <span className="text-xs font-bold text-yellow">{(results.occupancy[vid] * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow rounded-full h-2 transition-all" style={{ width: `${Math.min(results.occupancy[vid] * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500 mb-1 block">Paradas ({route.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {route.map((stop, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {stop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render Transfer results ──
  const renderTransferResults = () => {
    if (!results) return null;
    const { vuelos, resumen } = results;
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        {resumen && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Fuel óptimo</span>
              <div className="text-xl font-bold text-green-600">{resumen.fuel_total_mejor_kg?.toLocaleString()} kg</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Fuel peor</span>
              <div className="text-xl font-bold text-red-600">{resumen.fuel_total_peor_kg?.toLocaleString()} kg</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Ahorro</span>
              <div className="text-xl font-bold text-yellow">{resumen.ahorro_total_kg?.toLocaleString()} kg</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">% Ahorro</span>
              <div className="text-xl font-bold text-yellow">{resumen.ahorro_total_pct}%</div>
            </div>
          </div>
        )}

        {/* Flight details */}
        {vuelos && vuelos.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-darkGray mb-4">Detalle por vuelo</h3>
            <div className="space-y-4">
              {vuelos.map((v) => (
                <div key={v.vuelo_id} className="bg-white rounded-xl shadow-lg p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Plane className="text-blue-600" size={22} />
                    <h4 className="text-lg font-bold text-darkGray">
                      {v.vuelo_id}: {AIRPORTS_INFO[v.origen] || v.origen} → {AIRPORTS_INFO[v.destino] || v.destino}
                    </h4>
                    <span className="text-sm text-gray-500">{v.dist_km} km</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {v.por_franja?.map((f) => (
                      <div
                        key={f.franja}
                        className={`border-2 rounded-lg p-4 ${f.franja === v.mejor_franja ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-darkGray capitalize">{f.franja}</span>
                          {f.franja === v.mejor_franja && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">ÓPTIMA</span>
                          )}
                        </div>
                        <div className="text-xl font-bold text-yellow mb-1">{f.fuel_kg?.toLocaleString()} kg</div>
                        <div className={`text-sm font-semibold ${f.pct_extra_total > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {f.pct_extra_total > 0 ? `+${f.pct_extra_total}%` : '0%'}
                        </div>
                        <ul className="mt-2 space-y-0.5">
                          {f.motivos?.map((m, i) => (
                            <li key={i} className="text-xs text-gray-500">{m}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <span>Ahorro: <strong className="text-yellow">{v.ahorro_kg} kg</strong></span>
                    <span>Fuel base: {v.fuel_base_kg?.toLocaleString()} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Optimización de Envíos - S&O Logística</title>
        <meta name="description" content="Optimización Multi-Depot VRP y transferencia aérea mediante programación lineal." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 page-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-darkGray mb-3">Optimización de Envíos</h1>
            <p className="text-lg text-gray-600">Programación Lineal — Sube un JSON con los datos de tu problema</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setActiveTab('vrp'); setResults(null); setJsonContent(''); setFileName(''); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'vrp' ? 'bg-yellow text-darkGray shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Truck size={20} /> Camiones / Furgonetas (VRP)
            </button>
            <button
              onClick={() => { setActiveTab('transfer'); setResults(null); setJsonContent(''); setFileName(''); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'transfer' ? 'bg-yellow text-darkGray shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Plane size={20} /> Aviones (Transfer)
            </button>
          </div>

          {/* Upload section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-darkGray mb-2">
              {activeTab === 'vrp' ? 'Multi-Depot VRP — Flotas terrestres' : 'Transfer — Optimización aérea entre sucursales'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {activeTab === 'vrp'
                ? 'Sube un JSON con depots (id, lat, lng), flota (VAN/TRUCK por depósito), clients (id, lat, lng, nS, nM, nL).'
                : 'Sube un JSON con vuelos (id, origen, destino). Aeropuertos válidos: LEJ, CDG, FRA, MAD, BCN, BRU, EMA, LIS, MXP, VIE.'}
            </p>

            {/* File upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-yellow hover:bg-yellow/5 transition-all"
            >
              <Upload className="mx-auto mb-3 text-gray-400" size={36} />
              <p className="font-medium text-darkGray mb-1">
                {fileName ? fileName : 'Haz clic o arrastra un archivo JSON'}
              </p>
              <p className="text-sm text-gray-400">Solo archivos .json</p>
              <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* JSON preview */}
            {jsonContent && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                    <FileJson size={16} /> Vista previa del JSON
                  </span>
                  <span className="text-xs text-gray-400">{jsonContent.length} caracteres</span>
                </div>
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm text-darkGray bg-gray-50 focus:ring-2 focus:ring-yellow focus:border-transparent resize-y"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button onClick={handleLoadExample} variant="outline" className="flex-1 py-5 text-base rounded-xl border-gray-300 hover:border-yellow">
                Cargar ejemplo
              </Button>
              <Button onClick={handleDownloadExample} variant="outline" className="py-5 rounded-xl border-gray-300 hover:border-yellow">
                <Download size={18} className="mr-2" /> Descargar ejemplo
              </Button>
              <Button
                onClick={handleOptimize}
                disabled={loading || !jsonContent.trim()}
                className="flex-1 bg-yellow hover:bg-yellow/90 text-darkGray font-semibold py-5 text-base rounded-xl"
              >
                {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                {loading ? 'Optimizando...' : 'Optimizar'}
              </Button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div>
              <h2 className="text-2xl font-bold text-darkGray mb-6">Resultados</h2>
              {activeTab === 'vrp' ? renderVRPResults() : renderTransferResults()}
            </div>
          )}

          {/* Info boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h3 className="font-semibold text-darkGray mb-1">VRP — Camiones y Furgonetas</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Resolución de MDVRP con OR-Tools: asignación greedy de clientes a depósitos y CVRP con metaheurística GLS.
                Tipos: VAN (10 m³), TRUCK (20 m³). Paquetes: S (0.04 m³), M (0.20 m³), L (0.60 m³).
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-darkGray mb-1">Transfer — Aviones</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Minimiza el consumo de combustible eligiendo la mejor franja horaria (mañana/tarde/noche) para cada vuelo,
                considerando condiciones meteorológicas simuladas (viento, visibilidad, lluvia, tormentas).
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnviosOptimizacionPage;
