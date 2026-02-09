"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { PublicConfig, CTAConfig } from "@pawgo/shared";
import { getPublicConfig } from "@/lib/config";

interface ConfigContextType {
    config: PublicConfig | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<PublicConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchConfig = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getPublicConfig();
            setConfig(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Error desconocido"));
            // Fallback seguro
            setConfig({
                cta: {
                    action: "REDIRECT",
                    url: "/checkout",
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();

        // Escuchar actualizaciones manuales desde el admin
        const handleUpdate = () => {
            fetchConfig();
        };

        window.addEventListener("config:updated", handleUpdate);
        return () => window.removeEventListener("config:updated", handleUpdate);
    }, []);

    return (
        <ConfigContext.Provider
            value={{
                config,
                isLoading,
                error,
                refetch: fetchConfig,
            }}
        >
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig(): ConfigContextType {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error("useConfig must be used within a ConfigProvider");
    }
    return context;
}

// Hook específico para obtener solo la configuración del CTA
export function useCTAConfig(): CTAConfig | null {
    const { config } = useConfig();
    return config?.cta ?? null;
}
