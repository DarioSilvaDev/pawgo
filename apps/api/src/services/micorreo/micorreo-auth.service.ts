import { miCorreoConfig } from "../../config/micorreo.config.js";
import type { MiCorreoTokenResponse } from "./micorreo.types.js";

interface TokenCache {
    token: string;
    expiresAt: Date;
}

/**
 * Servicio de autenticación para MiCorreo API
 * Gestiona tokens JWT con cache automático
 */
export class MiCorreoAuthService {
    private tokenCache: TokenCache | null = null;

    /**
     * Obtiene un token JWT válido (usa cache si está disponible)
     */
    async getToken(): Promise<string> {
        // Verificar si hay token en cache y es válido
        if (this.isTokenValid()) {
            console.log("🔑 [MiCorreoAuth] Usando token en cache");
            return this.tokenCache!.token;
        }

        // Obtener nuevo token
        console.log("🔑 [MiCorreoAuth] Obteniendo nuevo token...");
        const tokenData = await this.fetchNewToken();

        // Cachear token
        if (miCorreoConfig.tokenCache.enabled) {
            this.cacheToken(tokenData);
        }

        return tokenData.token;
    }

    /**
     * Obtiene un nuevo token desde la API
     */
    private async fetchNewToken(): Promise<MiCorreoTokenResponse> {
        const { username, password } = miCorreoConfig.credentials;
        const authHeader = Buffer.from(`${username}:${password}`).toString("base64");

        const response = await fetch(`${miCorreoConfig.baseUrl}/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${authHeader}`,
            },
            signal: AbortSignal.timeout(miCorreoConfig.timeout),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("MiCorreo: Credenciales inválidas");
            }
            throw new Error(`MiCorreo: Error al obtener token (${response.status})`);
        }

        const data = (await response.json()) as MiCorreoTokenResponse;
        console.log(`✅ [MiCorreoAuth] Token obtenido. Expira: ${data.expires}`);
        return data;
    }

    /**
     * Cachea el token con buffer de tiempo
     */
    private cacheToken(tokenData: MiCorreoTokenResponse): void {
        const expiresAt = new Date(tokenData.expires);

        // Restar buffer para renovar antes de expiración
        expiresAt.setSeconds(expiresAt.getSeconds() - miCorreoConfig.tokenCache.ttlBuffer);

        this.tokenCache = {
            token: tokenData.token,
            expiresAt,
        };

        console.log(`💾 [MiCorreoAuth] Token cacheado hasta ${expiresAt.toISOString()}`);
    }

    /**
     * Verifica si el token en cache es válido
     */
    private isTokenValid(): boolean {
        if (!this.tokenCache) return false;
        return new Date() < this.tokenCache.expiresAt;
    }

    /**
     * Invalida el token en cache (útil para retry en caso de 401)
     */
    invalidateToken(): void {
        console.log("🗑️ [MiCorreoAuth] Token invalidado");
        this.tokenCache = null;
    }
}
