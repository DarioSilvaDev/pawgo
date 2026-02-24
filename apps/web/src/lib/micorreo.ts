import { fetchAPI } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MiCorreoAddress {
    streetName: string;
    streetNumber: string;
    floor?: string;
    apartment?: string;
    locality?: string;
    city: string;
    provinceCode: string; // código de una letra requerido por MiCorreo (ej: "B" para Buenos Aires)
    postalCode: string;
}

export interface RegisterCustomerDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    documentType: "DNI" | "CUIT";
    documentId: string;
    phone?: string;
    cellPhone?: string;
    address: MiCorreoAddress;
}

export interface ValidateUserDto {
    email: string;
    password: string;
}

export interface MiCorreoCustomerResponse {
    customerId: string;
    createdAt: string;
}

export interface Province {
    /** Nombre completo para mostrar en UI (desde GeorefAR) */
    nombre: string;
    /** Código de una letra requerido por MiCorreo */
    code: string;
}

// ─── Mapeo INDEC id → código MiCorreo (ISO 3166-2:AR simplificado) ───────────
// GeorefAR devuelve IDs numéricos del INDEC; MiCorreo usa un código de 1 letra.
// Este mapeo es estático porque las 24 provincias argentinas no cambian.
const INDEC_TO_MICORREO: Record<string, string> = {
    "06": "B", // Buenos Aires
    "02": "C", // Ciudad Autónoma de Buenos Aires
    "10": "K", // Catamarca
    "22": "H", // Chaco
    "26": "U", // Chubut
    "14": "X", // Córdoba
    "18": "W", // Corrientes
    "30": "E", // Entre Ríos
    "34": "P", // Formosa
    "38": "Y", // Jujuy
    "42": "L", // La Pampa
    "46": "F", // La Rioja
    "50": "M", // Mendoza
    "54": "N", // Misiones
    "58": "Q", // Neuquén
    "62": "R", // Río Negro
    "66": "A", // Salta
    "70": "J", // San Juan
    "74": "D", // San Luis
    "78": "Z", // Santa Cruz
    "82": "S", // Santa Fe
    "86": "G", // Santiago del Estero
    "94": "V", // Tierra del Fuego
    "90": "T", // Tucumán
};

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Obtiene provincias desde el backend (con caché de 24hs en GeoService).
 * Enriquece cada provincia con el código de MiCorreo.
 * Si el backend falla, devuelve la lista estática embebida como fallback.
 */
export async function getProvinces(): Promise<Province[]> {
    try {
        const response = await fetchAPI("/geo/provincias");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: { provincias: { id: string; nombre: string }[] } =
            await response.json();

        const mapped: Province[] = data.provincias
            .map((p) => ({
                nombre: p.nombre,
                code: INDEC_TO_MICORREO[p.id] ?? "",
            }))
            // Filtrar provincias sin mapeo conocido (no debería ocurrir)
            .filter((p) => p.code !== "");

        return mapped.sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
    } catch {
        // Fallback estático si el backend no responde
        return STATIC_PROVINCES;
    }
}

/** Lista estática de fallback — usada si /api/geo/provincias no está disponible */
export const STATIC_PROVINCES: Province[] = [
    { code: "B", nombre: "Buenos Aires" },
    { code: "C", nombre: "Ciudad Autónoma de Buenos Aires" },
    { code: "K", nombre: "Catamarca" },
    { code: "H", nombre: "Chaco" },
    { code: "U", nombre: "Chubut" },
    { code: "X", nombre: "Córdoba" },
    { code: "W", nombre: "Corrientes" },
    { code: "E", nombre: "Entre Ríos" },
    { code: "P", nombre: "Formosa" },
    { code: "Y", nombre: "Jujuy" },
    { code: "L", nombre: "La Pampa" },
    { code: "F", nombre: "La Rioja" },
    { code: "M", nombre: "Mendoza" },
    { code: "N", nombre: "Misiones" },
    { code: "Q", nombre: "Neuquén" },
    { code: "R", nombre: "Río Negro" },
    { code: "A", nombre: "Salta" },
    { code: "J", nombre: "San Juan" },
    { code: "D", nombre: "San Luis" },
    { code: "Z", nombre: "Santa Cruz" },
    { code: "S", nombre: "Santa Fe" },
    { code: "G", nombre: "Santiago del Estero" },
    { code: "V", nombre: "Tierra del Fuego" },
    { code: "T", nombre: "Tucumán" },
];

export async function registerMiCorreoCustomer(
    data: RegisterCustomerDto
): Promise<MiCorreoCustomerResponse> {
    const response = await fetchAPI("/micorreo/register", {
        method: "POST",
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const err = await response
            .json()
            .catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export async function validateMiCorreoUser(
    data: ValidateUserDto
): Promise<MiCorreoCustomerResponse> {
    const response = await fetchAPI("/micorreo/validate", {
        method: "POST",
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const err = await response
            .json()
            .catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
}
