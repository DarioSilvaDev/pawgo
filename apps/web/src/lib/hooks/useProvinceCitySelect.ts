/**
 * Hook personalizado para manejar selects dependientes de Provincia → Ciudad
 * Gestiona el estado, carga de datos y cancelación de requests
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getProvincias, getCiudadesByProvincia, Provincia, Ciudad } from "../api/geo";

interface UseProvinceCitySelectOptions {
    defaultProvinciaId?: string;
    defaultCiudadId?: string;
    onProvinceChange?: (provinciaId: string | null) => void;
    onCityChange?: (ciudadId: string | null) => void;
}

interface UseProvinceCitySelectReturn {
    // Estado de provincias
    provincias: Provincia[];
    provinciasLoading: boolean;
    provinciasError: string | null;

    // Estado de ciudades
    ciudades: Ciudad[];
    ciudadesLoading: boolean;
    ciudadesError: string | null;

    // Valores seleccionados
    selectedProvinciaId: string | null;
    selectedCiudadId: string | null;

    // Handlers
    handleProvinciaChange: (provinciaId: string | null) => void;
    handleCiudadChange: (ciudadId: string | null) => void;

    // Utilidades
    resetSelection: () => void;
}

export function useProvinceCitySelect(
    options: UseProvinceCitySelectOptions = {}
): UseProvinceCitySelectReturn {
    const {
        defaultProvinciaId,
        defaultCiudadId,
        onProvinceChange,
        onCityChange,
    } = options;

    // Estado de provincias
    const [provincias, setProvincias] = useState<Provincia[]>([]);
    const [provinciasLoading, setProvinciasLoading] = useState(false);
    const [provinciasError, setProvinciasError] = useState<string | null>(null);

    // Estado de ciudades
    const [ciudades, setCiudades] = useState<Ciudad[]>([]);
    const [ciudadesLoading, setCiudadesLoading] = useState(false);
    const [ciudadesError, setCiudadesError] = useState<string | null>(null);

    // Valores seleccionados
    const [selectedProvinciaId, setSelectedProvinciaId] = useState<string | null>(
        defaultProvinciaId || null
    );
    const [selectedCiudadId, setSelectedCiudadId] = useState<string | null>(
        defaultCiudadId || null
    );

    // Ref para cancelar requests en curso
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Carga las provincias al montar el componente
     */
    useEffect(() => {
        let isMounted = true;

        const loadProvincias = async () => {
            setProvinciasLoading(true);
            setProvinciasError(null);

            try {
                const data = await getProvincias();
                if (isMounted) {
                    setProvincias(data);
                }
            } catch (error) {
                if (isMounted) {
                    setProvinciasError(
                        error instanceof Error
                            ? error.message
                            : "Error al cargar las provincias"
                    );
                }
            } finally {
                if (isMounted) {
                    setProvinciasLoading(false);
                }
            }
        };

        loadProvincias();

        return () => {
            isMounted = false;
        };
    }, []);

    /**
     * Carga las ciudades cuando cambia la provincia seleccionada
     */
    useEffect(() => {
        if (!selectedProvinciaId) {
            setCiudades([]);
            setCiudadesError(null);
            return;
        }

        let isMounted = true;

        // Cancelar request anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const loadCiudades = async () => {
            setCiudadesLoading(true);
            setCiudadesError(null);

            try {
                const data = await getCiudadesByProvincia(selectedProvinciaId);
                if (isMounted) {
                    setCiudades(data);
                }
            } catch (error) {
                if (isMounted) {
                    setCiudadesError(
                        error instanceof Error
                            ? error.message
                            : "Error al cargar las ciudades"
                    );
                    setCiudades([]);
                }
            } finally {
                if (isMounted) {
                    setCiudadesLoading(false);
                }
            }
        };

        const currentAbortController = abortControllerRef.current;
        loadCiudades();

        return () => {
            isMounted = false;
            if (currentAbortController) {
                currentAbortController.abort();
            }
        };
    }, [selectedProvinciaId]);

    /**
     * Handler para cambio de provincia
     */
    const handleProvinciaChange = useCallback(
        (provinciaId: string | null) => {
            setSelectedProvinciaId(provinciaId);
            setSelectedCiudadId(null); // Resetear ciudad al cambiar provincia
            setCiudades([]); // Limpiar ciudades

            if (onProvinceChange) {
                onProvinceChange(provinciaId);
            }

            // Notificar que la ciudad se reseteó
            if (onCityChange) {
                onCityChange(null);
            }
        },
        [onProvinceChange, onCityChange]
    );

    /**
     * Handler para cambio de ciudad
     */
    const handleCiudadChange = useCallback(
        (ciudadId: string | null) => {
            setSelectedCiudadId(ciudadId);

            if (onCityChange) {
                onCityChange(ciudadId);
            }
        },
        [onCityChange]
    );

    /**
     * Resetea toda la selección
     */
    const resetSelection = useCallback(() => {
        setSelectedProvinciaId(null);
        setSelectedCiudadId(null);
        setCiudades([]);

        if (onProvinceChange) {
            onProvinceChange(null);
        }
        if (onCityChange) {
            onCityChange(null);
        }
    }, [onProvinceChange, onCityChange]);

    return {
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
        resetSelection,
    };
}
