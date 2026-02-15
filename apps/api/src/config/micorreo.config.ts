import { envs } from "./envs.js";

export const miCorreoConfig = {
    baseUrl: envs.MICORREO_BASE_URL || "https://apitest.correoargentino.com.ar/micorreo/v1",
    credentials: {
        username: envs.MICORREO_USERNAME,
        password: envs.MICORREO_PASSWORD,
    },
    tokenCache: {
        enabled: envs.MICORREO_TOKEN_CACHE_ENABLED === "true",
        ttlBuffer: 300, // 5 minutos antes de expiración
    },
    retry: {
        maxRetries: 3,
        backoffMs: 1000,
    },
    timeout: 30000, // 30 segundos
    rateCache: {
        enabled: true,
        ttlMinutes: 60, // Cache de cotizaciones por 1 hora
    },
};
