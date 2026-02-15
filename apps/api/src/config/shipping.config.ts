/**
 * Configuración de envíos
 */
export const shippingConfig = {
    // Dimensiones estándar del paquete (todas las órdenes)
    standardPackage: {
        weight: 500, // gramos
        height: 18,  // cm
        width: 17,   // cm
        length: 8,   // cm
    },

    // Código postal de origen (almacén/depósito)
    originPostalCode: "1414", // CABA - Cambiar según ubicación del almacén

    // Estrategia de envío
    freeShipping: true, // Envío gratis para el cliente
    trackRealCosts: true, // Registrar costos reales de MiCorreo
} as const;
