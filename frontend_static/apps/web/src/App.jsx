
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import RutaOptimizacionPage from './pages/RutaOptimizacionPage.jsx';
import EnviosOptimizacionPage from './pages/EnviosOptimizacionPage.jsx';
import DemandaPrediccionPage from './pages/DemandaPrediccionPage.jsx';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ruta" element={<RutaOptimizacionPage />} />
            <Route path="/envios" element={<EnviosOptimizacionPage />} />
            <Route path="/demanda" element={<DemandaPrediccionPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
