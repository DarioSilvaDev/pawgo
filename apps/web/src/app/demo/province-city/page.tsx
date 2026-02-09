"use client";

/**
 * Página de ejemplo/demo del componente ProvinceCitySelect
 * Muestra diferentes casos de uso y configuraciones
 */

import React, { useState } from "react";
import ProvinceCitySelect from "@/components/ProvinceCitySelect";

export default function ProvinceCityDemoPage() {
    const [selectedData, setSelectedData] = useState<{
        provinciaId: string | null;
        provinciaNombre: string | null;
        ciudadId: string | null;
        ciudadNombre: string | null;
    }>({
        provinciaId: null,
        provinciaNombre: null,
        ciudadId: null,
        ciudadNombre: null,
    });

    const handleProvinceChange = (id: string | null, nombre: string | null) => {
        console.log("Provincia seleccionada:", { id, nombre });
        setSelectedData((prev) => ({
            ...prev,
            provinciaId: id,
            provinciaNombre: nombre,
            ciudadId: null,
            ciudadNombre: null,
        }));
    };

    const handleCityChange = (id: string | null, nombre: string | null) => {
        console.log("Ciudad seleccionada:", { id, nombre });
        setSelectedData((prev) => ({
            ...prev,
            ciudadId: id,
            ciudadNombre: nombre,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(
            `Datos seleccionados:\n\nProvincia: ${selectedData.provinciaNombre || "N/A"} (ID: ${selectedData.provinciaId || "N/A"})\nCiudad: ${selectedData.ciudadNombre || "N/A"} (ID: ${selectedData.ciudadId || "N/A"})`
        );
    };

    return (
        <div className="demo-page">
            <div className="container">
                <header className="header">
                    <h1>Selector de Provincia y Ciudad</h1>
                    <p className="subtitle">
                        Componente reutilizable para seleccionar ubicación en Argentina
                    </p>
                </header>

                <div className="demo-section">
                    <h2>Ejemplo Básico</h2>
                    <p className="description">
                        Componente con configuración estándar, ideal para formularios de
                        checkout o registro.
                    </p>

                    <form onSubmit={handleSubmit} className="demo-form">
                        <ProvinceCitySelect
                            onProvinceChange={handleProvinceChange}
                            onCityChange={handleCityChange}
                            required
                            showLabels
                        />

                        <button type="submit" className="submit-button">
                            Continuar
                        </button>
                    </form>

                    {/* Información de selección actual */}
                    {(selectedData.provinciaId || selectedData.ciudadId) && (
                        <div className="selection-info">
                            <h3>Selección Actual:</h3>
                            <div className="info-grid">
                                {selectedData.provinciaId && (
                                    <div className="info-item">
                                        <span className="info-label">Provincia:</span>
                                        <span className="info-value">
                                            {selectedData.provinciaNombre} (ID: {selectedData.provinciaId})
                                        </span>
                                    </div>
                                )}
                                {selectedData.ciudadId && (
                                    <div className="info-item">
                                        <span className="info-label">Ciudad:</span>
                                        <span className="info-value">
                                            {selectedData.ciudadNombre} (ID: {selectedData.ciudadId})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="demo-section">
                    <h2>Características</h2>
                    <ul className="features-list">
                        <li>✅ Carga dinámica de ciudades según provincia seleccionada</li>
                        <li>✅ Estados de loading y error manejados automáticamente</li>
                        <li>✅ Cancelación de requests al cambiar de provincia</li>
                        <li>✅ Diseño responsive (mobile-first)</li>
                        <li>✅ Accesibilidad (ARIA labels, estados disabled)</li>
                        <li>✅ Integrable con Formik, React Hook Form, etc.</li>
                        <li>✅ Tipado fuerte con TypeScript</li>
                        <li>✅ Caching en backend (24h provincias, 12h ciudades)</li>
                    </ul>
                </div>

                <div className="demo-section">
                    <h2>Uso en Código</h2>
                    <pre className="code-block">
                        <code>{`import ProvinceCitySelect from "@/components/ProvinceCitySelect";

function CheckoutForm() {
  const handleProvinceChange = (id, nombre) => {
    console.log("Provincia:", { id, nombre });
  };

  const handleCityChange = (id, nombre) => {
    console.log("Ciudad:", { id, nombre });
  };

  return (
    <form>
      <ProvinceCitySelect
        onProvinceChange={handleProvinceChange}
        onCityChange={handleCityChange}
        required
        showLabels
      />
      <button type="submit">Enviar</button>
    </form>
  );
}`}</code>
                    </pre>
                </div>
            </div>

            <style jsx>{`
        .demo-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 2rem;
        }

        .header {
          text-align: center;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 1.125rem;
          color: #6b7280;
          margin: 0;
        }

        .demo-section {
          margin-bottom: 3rem;
        }

        .demo-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .description {
          color: #6b7280;
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .demo-form {
          background: #f9fafb;
          padding: 2rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
        }

        .submit-button {
          width: 100%;
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 1.5rem;
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }

        .submit-button:active {
          transform: translateY(0);
        }

        .selection-info {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: #eff6ff;
          border-radius: 0.75rem;
          border: 1px solid #bfdbfe;
        }

        .selection-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e40af;
          margin: 0 0 1rem 0;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
        }

        .info-value {
          font-size: 1rem;
          color: #1f2937;
          font-weight: 500;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }

        .features-list li {
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border-left: 4px solid #667eea;
          color: #374151;
          font-size: 0.9375rem;
        }

        .code-block {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1.5rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .code-block code {
          font-family: "Fira Code", "Courier New", monospace;
        }

        @media (min-width: 768px) {
          .container {
            padding: 3rem;
          }

          .header h1 {
            font-size: 3rem;
          }

          .info-grid {
            flex-direction: row;
            gap: 2rem;
          }

          .info-item {
            flex: 1;
          }
        }
      `}</style>
        </div>
    );
}
