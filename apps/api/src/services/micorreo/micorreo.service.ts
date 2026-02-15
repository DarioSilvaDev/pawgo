import { miCorreoConfig } from "../../config/micorreo.config.js";
import { prisma } from "../../config/prisma.client.js";
import { MiCorreoAuthService } from "./micorreo-auth.service.js";
import {
    MiCorreoApiError,
    type RegisterCustomerRequest,
    type RegisterCustomerResponse,
    type ValidateUserRequest,
    type ValidateUserResponse,
    type GetRatesRequest,
    type GetRatesResponse,
} from "./micorreo.types.js";

/**
 * Servicio principal de MiCorreo
 * Gestiona todas las operaciones con la API de Correo Argentino
 */
export class MiCorreoService {
    private authService: MiCorreoAuthService;

    constructor() {
        this.authService = new MiCorreoAuthService();
    }

    // ============================================
    // 1. REGISTER CUSTOMER
    // ============================================

    /**
     * Registra un nuevo cliente en MiCorreo y guarda en BD local
     */
    async registerCustomer(data: RegisterCustomerRequest, leadId?: string): Promise<RegisterCustomerResponse> {
        // Registrar en MiCorreo
        const response = await this.makeAuthenticatedRequest<RegisterCustomerResponse>("/register", {
            method: "POST",
            body: JSON.stringify(data),
        });

        // Guardar en base de datos local
        try {
            await prisma.miCorreoCustomer.create({
                data: {
                    customerId: response.customerId,
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    documentType: data.documentType,
                    documentId: data.documentId,
                    phone: data.phone,
                    cellPhone: data.cellPhone,
                    address: data.address,
                    leadId: leadId || null,
                },
            });
            console.log(`💾 [MiCorreo] Cliente guardado en BD: ${response.customerId}`);
        } catch (error) {
            console.warn("⚠️ [MiCorreo] Error al guardar cliente en BD:", error);
            // No fallar si hay error en BD local, el registro en MiCorreo fue exitoso
        }

        return response;
    }

    // ============================================
    // 2. VALIDATE USER
    // ============================================

    /**
     * Valida credenciales de usuario y obtiene customerId
     */
    async validateUser(data: ValidateUserRequest): Promise<ValidateUserResponse> {
        return this.makeAuthenticatedRequest<ValidateUserResponse>("/users/validate", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    // ============================================
    // 3. GET RATES
    // ============================================

    /**
     * Obtiene cotizaciones de envío (con cache)
     */
    async getRates(data: GetRatesRequest): Promise<GetRatesResponse> {
        // Validar dimensiones
        this.validateDimensions(data.dimensions);

        // Verificar cache
        if (miCorreoConfig.rateCache.enabled) {
            const cached = await this.getCachedRates(data);
            if (cached) {
                console.log("💾 [MiCorreo] Usando cotización en cache");
                return cached;
            }
        }

        // Obtener de API
        const response = await this.makeAuthenticatedRequest<GetRatesResponse>("/rates", {
            method: "POST",
            body: JSON.stringify(data),
        });

        // Guardar en cache
        if (miCorreoConfig.rateCache.enabled) {
            await this.cacheRates(data, response);
        }

        return response;
    }

    // ============================================
    // CACHE METHODS
    // ============================================

    /**
     * Obtiene cotización desde cache si existe y es válida
     */
    private async getCachedRates(request: GetRatesRequest): Promise<GetRatesResponse | null> {
        try {
            const cached = await prisma.miCorreoRateCache.findFirst({
                where: {
                    customerId: request.customerId,
                    postalCodeOrigin: request.postalCodeOrigin,
                    postalCodeDestination: request.postalCodeDestination,
                    weight: request.dimensions.weight,
                    height: request.dimensions.height,
                    width: request.dimensions.width,
                    length: request.dimensions.length,
                    validTo: {
                        gte: new Date(), // Solo cache válido
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            if (cached) {
                return {
                    customerId: cached.customerId,
                    validTo: cached.validTo.toISOString(),
                    rates: cached.rates as any,
                };
            }
        } catch (error) {
            console.warn("⚠️ [MiCorreo] Error al obtener cache:", error);
        }

        return null;
    }

    /**
     * Guarda cotización en cache
     */
    private async cacheRates(request: GetRatesRequest, response: GetRatesResponse): Promise<void> {
        try {
            // Buscar miCorreoCustomerId
            const customer = await prisma.miCorreoCustomer.findUnique({
                where: { customerId: request.customerId },
                select: { id: true },
            });

            await prisma.miCorreoRateCache.create({
                data: {
                    customerId: request.customerId,
                    miCorreoCustomerId: customer?.id,
                    postalCodeOrigin: request.postalCodeOrigin,
                    postalCodeDestination: request.postalCodeDestination,
                    weight: request.dimensions.weight,
                    height: request.dimensions.height,
                    width: request.dimensions.width,
                    length: request.dimensions.length,
                    rates: response.rates,
                    validTo: new Date(response.validTo),
                },
            });

            console.log(`💾 [MiCorreo] Cotización cacheada hasta ${response.validTo}`);
        } catch (error) {
            console.warn("⚠️ [MiCorreo] Error al cachear cotización:", error);
            // No fallar si hay error en cache
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Realiza una petición autenticada con JWT
     */
    private async makeAuthenticatedRequest<T>(
        endpoint: string,
        options: RequestInit,
        retryCount = 0
    ): Promise<T> {
        try {
            const token = await this.authService.getToken();

            const response = await fetch(`${miCorreoConfig.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...options.headers,
                },
                signal: AbortSignal.timeout(miCorreoConfig.timeout),
            });

            // Si es 401, invalidar token y reintentar una vez
            if (response.status === 401 && retryCount === 0) {
                console.log("🔄 [MiCorreo] Token expirado, reintentando...");
                this.authService.invalidateToken();
                return this.makeAuthenticatedRequest<T>(endpoint, options, retryCount + 1);
            }

            // Manejar errores
            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as any;
                throw new MiCorreoApiError(
                    errorData.code || String(response.status),
                    errorData.message || response.statusText,
                    response.status
                );
            }

            return (await response.json()) as T;
        } catch (error) {
            // Retry para errores de red o 50x
            if (this.shouldRetry(error, retryCount)) {
                const delay = miCorreoConfig.retry.backoffMs * (retryCount + 1);
                console.log(`🔄 [MiCorreo] Reintentando en ${delay}ms...`);
                await this.delay(delay);
                return this.makeAuthenticatedRequest<T>(endpoint, options, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Valida las dimensiones del paquete
     */
    private validateDimensions(dimensions: GetRatesRequest["dimensions"]): void {
        const { weight, height, width, length } = dimensions;

        if (weight < 1 || weight > 25000) {
            throw new Error("El peso debe estar entre 1g y 25000g");
        }

        if (height > 150 || width > 150 || length > 150) {
            throw new Error("Las dimensiones no pueden exceder 150cm");
        }

        // Verificar que sean enteros
        if (
            !Number.isInteger(weight) ||
            !Number.isInteger(height) ||
            !Number.isInteger(width) ||
            !Number.isInteger(length)
        ) {
            throw new Error("Las dimensiones deben ser valores enteros");
        }
    }

    /**
     * Determina si se debe reintentar la petición
     */
    private shouldRetry(error: any, retryCount: number): boolean {
        if (retryCount >= miCorreoConfig.retry.maxRetries) {
            return false;
        }

        // Retry para errores de red
        if (error.name === "TypeError" || error.name === "AbortError") {
            return true;
        }

        // Retry para errores 50x y 429
        if (error instanceof MiCorreoApiError) {
            return error.statusCode ? error.statusCode >= 500 || error.statusCode === 429 : false;
        }

        return false;
    }

    /**
     * Delay helper para retry
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Obtiene un cliente de MiCorreo por email
     */
    async getCustomerByEmail(email: string) {
        return prisma.miCorreoCustomer.findUnique({
            where: { email },
        });
    }

    /**
     * Obtiene un cliente de MiCorreo por customerId
     */
    async getCustomerById(customerId: string) {
        return prisma.miCorreoCustomer.findUnique({
            where: { customerId },
        });
    }
}
