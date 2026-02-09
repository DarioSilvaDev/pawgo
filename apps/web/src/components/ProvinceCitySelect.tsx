"use client";

/**
 * Componente reutilizable de selects dependientes para Provincia → Ciudad
 * Diseñado para integrarse fácilmente con formularios (Formik, React Hook Form, etc.)
 */

import React from "react";
import { useProvinceCitySelect } from "@/lib/hooks/useProvinceCitySelect";

export interface ProvinceCitySelectProps {
    /**
     * Callback cuando cambia la provincia seleccionada
     */
    onProvinceChange?: (provinciaId: string | null, provinciaNombre: string | null) => void;

    /**
     * Callback cuando cambia la ciudad seleccionada
     */
    onCityChange?: (ciudadId: string | null, ciudadNombre: string | null) => void;

    /**
     * ID de provincia por defecto
     */
    defaultProvinciaId?: string;

    /**
     * ID de ciudad por defecto
     */
    defaultCiudadId?: string;

    /**
     * Deshabilitar ambos selects
     */
    disabled?: boolean;

    /**
     * Clases CSS personalizadas para el contenedor
     */
    className?: string;

    /**
     * Mostrar labels
     */
    showLabels?: boolean;

    /**
     * Requerido (para validación visual)
     */
    required?: boolean;

    /**
     * Nombres de los campos (útil para formularios)
     */
    names?: {
        provincia?: string;
        ciudad?: string;
    };
}

export const ProvinceCitySelect: React.FC<ProvinceCitySelectProps> = ({
    onProvinceChange,
    onCityChange,
    defaultProvinciaId,
    defaultCiudadId,
    disabled = false,
    className = "",
    showLabels = true,
    required = false,
    names = { provincia: "provinciaId", ciudad: "ciudadId" },
}) => {
    const {
        provincias,
        provinciasLoading,
        provinciasError,
        ciudades,
        ciudadesLoading,
        ciudadesError,
        selectedProvinciaId,
        selectedCiudadId,
        handleProvinciaChange,
        handleCiudadChange,
    } = useProvinceCitySelect({
        defaultProvinciaId,
        defaultCiudadId,
        onProvinceChange: (id) => {
            const provincia = provincias.find((p) => p.id === id);
            onProvinceChange?.(id, provincia?.nombre || null);
        },
        onCityChange: (id) => {
            const ciudad = ciudades.find((c) => c.id === id);
            onCityChange?.(id, ciudad?.nombre || null);
        },
    });

    const handleProvinciaSelectChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const value = e.target.value;
        handleProvinciaChange(value || null);
    };

    const handleCiudadSelectChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const value = e.target.value;
        handleCiudadChange(value || null);
    };

    return (
        <div className={`province-city-select ${className}`}>
            {/* Select de Provincia */}
            <div className="form-group">
                {showLabels && (
                    <label htmlFor={names.provincia} className="form-label">
                        Provincia {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <select
                    id={names.provincia}
                    name={names.provincia}
                    value={selectedProvinciaId || ""}
                    onChange={handleProvinciaSelectChange}
                    disabled={disabled || provinciasLoading}
                    required={required}
                    className="form-select"
                    aria-label="Seleccionar provincia"
                >
                    <option value="">
                        {provinciasLoading
                            ? "Cargando provincias..."
                            : provinciasError
                                ? "Error al cargar provincias"
                                : "Seleccione una provincia"}
                    </option>
                    {provincias.map((provincia) => (
                        <option key={provincia.id} value={provincia.id}>
                            {provincia.nombre}
                        </option>
                    ))}
                </select>
                {provinciasError && (
                    <p className="error-message" role="alert">
                        {provinciasError}
                    </p>
                )}
            </div>

            {/* Select de Ciudad */}
            <div className="form-group">
                {showLabels && (
                    <label htmlFor={names.ciudad} className="form-label">
                        Ciudad/Localidad {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <select
                    id={names.ciudad}
                    name={names.ciudad}
                    value={selectedCiudadId || ""}
                    onChange={handleCiudadSelectChange}
                    disabled={disabled || !selectedProvinciaId || ciudadesLoading}
                    required={required}
                    className="form-select"
                    aria-label="Seleccionar ciudad"
                >
                    <option value="">
                        {!selectedProvinciaId
                            ? "Primero seleccione una provincia"
                            : ciudadesLoading
                                ? "Cargando ciudades..."
                                : ciudadesError
                                    ? "Error al cargar ciudades"
                                    : ciudades.length === 0
                                        ? "No hay ciudades disponibles"
                                        : "Seleccione una ciudad"}
                    </option>
                    {ciudades.map((ciudad) => (
                        <option key={ciudad.id} value={ciudad.id}>
                            {ciudad.nombre}
                        </option>
                    ))}
                </select>
                {ciudadesError && (
                    <p className="error-message" role="alert">
                        {ciudadesError}
                    </p>
                )}
            </div>

            <style jsx>{`
        .province-city-select {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          display: block;
        }

        .form-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          color: #1f2937;
          background-color: #ffffff;
          background-clip: padding-box;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 16px 12px;
          padding-right: 2.5rem;
        }

        .form-select:focus {
          border-color: #3b82f6;
          outline: 0;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-select:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .error-message {
          font-size: 0.875rem;
          color: #ef4444;
          margin: 0;
        }

        @media (min-width: 768px) {
          .province-city-select {
            flex-direction: row;
            gap: 1rem;
          }

          .form-group {
            flex: 1;
          }
        }
      `}</style>
        </div>
    );
};

export default ProvinceCitySelect;
