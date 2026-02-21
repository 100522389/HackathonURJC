
import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  const footerLinks = [
    {
      title: 'Servicios',
      links: [
        { name: 'Routing (A*)', path: '/ruta' },
        { name: 'Programación Lineal', path: '/envios' },
        { name: 'Predicción ML', path: '/demanda' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { name: 'Sobre Nosotros', path: '/' },
        { name: 'Contacto', path: '/' },
        { name: 'Documentación', path: '/' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacidad', path: '/' },
        { name: 'Términos', path: '/' },
        { name: 'Cookies', path: '/' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-3xl font-bold text-yellow">S</span>
              <span className="text-3xl font-bold text-red">&</span>
              <span className="text-3xl font-bold text-yellow">O</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Soluciones inteligentes de logística para un futuro sostenible. Optimizamos rutas, envíos y demanda con tecnología de vanguardia.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-yellow transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-yellow transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="mailto:info@syo.com"
                className="text-gray-600 hover:text-yellow transition-colors"
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <span className="text-sm font-semibold text-darkGray uppercase tracking-wider">
                {section.title}
              </span>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-600 hover:text-yellow transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} S&O Logística. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Desarrollado para</span>
              <span className="px-3 py-1 bg-yellow text-darkGray text-sm font-semibold rounded-full">
                Hackathon URJC
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
