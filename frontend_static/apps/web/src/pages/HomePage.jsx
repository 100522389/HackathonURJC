
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Map, Truck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  const services = [
    {
      icon: Map,
      title: 'Routing — A* Bidireccional',
      description: 'Mapa interactivo con A* bidireccional sobre 23.9M nodos de la red vial de EE.UU. Selecciona puntos o POIs de importación/exportación.',
      path: '/ruta',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Truck,
      title: 'Programación Lineal',
      description: 'Multi-Depot VRP para camiones/furgonetas y optimización aérea entre sucursales. Sube tu JSON y obtén la solución óptima.',
      path: '/envios',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: TrendingUp,
      title: 'Predicción de Demanda (ML)',
      description: 'LightGBM para predecir pedidos por zona H3 en Hangzhou. MAE 1.75. Predicción por historial o posición GPS.',
      path: '/demanda',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const metrics = [
    { value: 23.9, suffix: 'M', label: 'nodos', description: 'Red vial procesada' },
    { value: 1.75, suffix: '', label: 'MAE', description: 'Precisión predicción' },
    { value: 2.85, suffix: '%', label: 'ahorro', description: 'Combustible aéreo' },
  ];

  const [counters, setCounters] = useState(metrics.map(() => 0));

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const timers = metrics.map((metric, index) => {
      let currentStep = 0;
      return setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const currentValue = metric.value * progress;
        
        setCounters(prev => {
          const newCounters = [...prev];
          newCounters[index] = currentValue;
          return newCounters;
        });

        if (currentStep >= steps) {
          clearInterval(timers[index]);
        }
      }, interval);
    });

    return () => timers.forEach(timer => clearInterval(timer));
  }, []);

  return (
    <>
      <Helmet>
        <title>S&O Logística - Logística inteligente. Impacto sostenible.</title>
        <meta name="description" content="Soluciones avanzadas de optimización logística con IA. Optimización de rutas, envíos, predicción de demanda y combustible aéreo." />
      </Helmet>

      <div className="page-fade-in">
        {/* Hero Section */}
        <section className="relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
          {/* Background Image with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1686061593213-98dad7c599b9"
              alt="Modern logistics warehouse with automated systems"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-darkGray/80 via-darkGray/60 to-darkGray/40"></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Logística inteligente.
              <br />
              <span className="text-yellow">Impacto sostenible.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Optimizamos tu cadena de suministro con algoritmos avanzados y machine learning. 
              Reduce costos, mejora eficiencia y minimiza tu huella de carbono.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link to="/ruta">
                <Button className="bg-yellow hover:bg-yellow/90 text-darkGray font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  Explorar servicios
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section className="section-spacing bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-darkGray mb-4">
                Nuestros Servicios
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Soluciones tecnológicas de vanguardia para cada desafío logístico
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Link to={service.path}>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full card-hover card-shadow hover:border-yellow transition-all duration-300">
                      <div className={`${service.bgColor} ${service.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                        <service.icon size={28} />
                      </div>
                      <h3 className="text-xl font-semibold text-darkGray mb-3">
                        {service.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section className="section-spacing bg-gradient-to-br from-yellow/10 to-red/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-darkGray mb-4">
                Resultados que Importan
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Métricas clave de nuestras soluciones de optimización
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="text-center counter-animation"
                >
                  <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="text-5xl md:text-6xl font-bold text-yellow mb-2">
                      {counters[index].toFixed(metric.suffix === 'M' ? 1 : 2)}
                      <span className="text-3xl md:text-4xl ml-1">{metric.suffix}</span>
                    </div>
                    <div className="text-xl font-semibold text-darkGray mb-2">
                      {metric.label}
                    </div>
                    <p className="text-gray-600">
                      {metric.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-spacing bg-darkGray text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para optimizar tu logística?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Descubre cómo nuestras soluciones pueden transformar tu cadena de suministro
            </p>
            <Link to="/ruta">
              <Button className="bg-yellow hover:bg-yellow/90 text-darkGray font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                Comenzar ahora
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
