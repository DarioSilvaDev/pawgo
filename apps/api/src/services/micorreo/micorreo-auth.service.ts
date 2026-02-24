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
        if (this.isTokenValid()) {
            console.log("🔑 [MiCorreoAuth] Usando token en cache");
            return this.tokenCache!.token;
        }

        console.log("🔑 [MiCorreoAuth] Obteniendo nuevo token...");
        const tokenData = await this.fetchNewToken();

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
        console.log(`✅ [MiCorreoAuth] Token obtenido. expire: "${data.expire}"`);
        return data;
    }

    /**
     * Cachea el token con buffer de tiempo
     */
    private cacheToken(tokenData: MiCorreoTokenResponse): void {
        const expiresAt = this.parseExpireDate(tokenData.expire);

        // Restar buffer para renovar antes de expiración
        expiresAt.setSeconds(expiresAt.getSeconds() - miCorreoConfig.tokenCache.ttlBuffer);

        this.tokenCache = {
            token: tokenData.token,
            expiresAt,
        };

        console.log(`💾 [MiCorreoAuth] Token cacheado hasta ${expiresAt.toISOString()}`);
    }

    /**
     * Parsea el campo `expire` de la respuesta de MiCorreo.
     * La API puede devolver distintos formatos (ISO 8601, dd/mm/yyyy hh:mm:ss, Unix epoch).
     * Si el valor no es parseable, usa un fallback de 1 hora.
     */
    private parseExpireDate(expire: string | undefined): Date {
        console.log(`🕒 [MiCorreoAuth] Parseando expire: "${expire}"`);

        if (!expire) {
            console.warn("⚠️ [MiCorreoAuth] Campo expire ausente en la respuesta. Usando fallback de 1 hora.");
            return new Date(Date.now() + 60 * 60 * 1000);
        }

        // Intento 1: ISO 8601 estándar
        const direct = new Date(expire);
        if (!isNaN(direct.getTime())) {
            return direct;
        }

        // Intento 2: dd/mm/yyyy hh:mm:ss (formato común en Argentina)
        const ddmmyyyy = expire.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (ddmmyyyy) {
            const [, day, month, year, hour, min, sec] = ddmmyyyy;
            const parsed = new Date(
                Number(year), Number(month) - 1, Number(day),
                Number(hour), Number(min), Number(sec)
            );
            if (!isNaN(parsed.getTime())) {
                console.log(`✅ [MiCorreoAuth] Fecha parseada como dd/mm/yyyy: ${parsed.toISOString()}`);
                return parsed;
            }
        }

        // Intento 3: Unix timestamp en segundos
        const asNumber = Number(expire);
        if (!isNaN(asNumber) && asNumber > 0) {
            const fromEpoch = new Date(asNumber * 1000);
            if (!isNaN(fromEpoch.getTime())) {
                console.log(`✅ [MiCorreoAuth] Fecha parseada como Unix timestamp: ${fromEpoch.toISOString()}`);
                return fromEpoch;
            }
        }

        // Fallback: token válido por 1 hora
        console.warn(`⚠️ [MiCorreoAuth] No se pudo parsear expire="${expire}". Usando fallback de 1 hora.`);
        return new Date(Date.now() + 60 * 60 * 1000);
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
