import "dotenv/config";
import { z } from "zod";

interface IEnvVars {
    PORT: number;
    NODE_ENV: string;
    DATABASE_URL: string;
    FRONTEND_URL: string;
    API_URL: string;
    PUBLIC_URL: string;
    JWT_SECRET: string;
    MERCADOPAGO_ACCESS_TOKEN: string;
    MERCADOPAGO_PUBLIC_KEY: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_FROM: string;
    JOB_DISCOUNT_CODE_SCAN_CRON: string;
    B2_ENDPOINT: string;
    B2_REGION: string;
    B2_BUCKET: string;
    B2_KEY_ID: string;
    B2_APP_KEY: string;
    B2_BUCKET_ID: string;
}
// Schema de validación de variables de entorno
const envsSchema = z
    .object({
        // Servidor
        PORT: z
            .string()
            .transform((val) => (val ? parseInt(val, 10) : 3001))
            .pipe(z.number().int().positive())
            .default("3001")
            .describe("El puerto en el que se ejecutará la aplicación"),
        NODE_ENV: z
            .enum(["development", "production", "test"])
            .default("development")
            .describe("El entorno en el que se ejecutará la aplicación"),

        HOST: z.string().default("0.0.0.0").describe("El host en el que se ejecutará la aplicación"),
        // Base de datos
        DATABASE_URL: z.string().describe("La URL de la base de datos"),

        // URLs
        FRONTEND_URL: z.string().url().describe("La URL de la aplicación frontend"),
        API_URL: z.string().url().optional().describe("La URL de la API"),
        PUBLIC_URL: z.string().url().optional().describe("La URL pública de la API"),

        // JWT
        JWT_SECRET: z.string().min(32).describe("El secreto para firmar los tokens JWT (mínimo 32 caracteres)"),

        // MercadoPago
        MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).describe("El token de acceso de MercadoPago"),
        MERCADOPAGO_PUBLIC_KEY: z.string().min(1).describe("La clave pública de MercadoPago"),

        // SMTP
        SMTP_USER: z.string().min(1).describe("El usuario de SMTP"),
        SMTP_PASS: z.string().min(1).describe("La contraseña de SMTP"),
        SMTP_HOST: z.string().min(1).describe("El host de SMTP"),
        SMTP_PORT: z
            .string()
            .transform((val) => (val ? parseInt(val, 10) : 587))
            .pipe(z.number().int().positive())
            .default("465")
            .optional()
            .describe("El puerto de SMTP"),
        SMTP_FROM: z.string().email().optional().describe("El email desde el que se enviarán los correos"),

        // Jobs
        JOB_DISCOUNT_CODE_SCAN_CRON: z.string().default("0 */6 * * *").describe("El cron para el job de escaneo de códigos de descuento"),

        // Backblaze B2 (opcionales - solo necesarios si se usa almacenamiento en B2)
        B2_ENDPOINT: z.string().describe("El endpoint de Backblaze B2"),
        B2_REGION: z.string().describe("La región de Backblaze B2"),
        B2_BUCKET: z.string().describe("El nombre del bucket de Backblaze B2"),
        B2_KEY_ID: z.string().describe("Alias para el ID de aplicación (Key ID)"),
        B2_APP_KEY: z.string().describe("La clave de aplicación de Backblaze B2 (alias de B2_APPLICATION_KEY)"),
        B2_BUCKET_ID: z.string().describe("El ID del bucket de Backblaze B2"),
    })
    .passthrough(); // Permite propiedades adicionales (variables de entorno del sistema)

// Función para validar y parsear las variables de entorno
function validateEnv() {
    try {
        const parsed = envsSchema.parse(process.env as unknown as IEnvVars);
        console.log("✅ Variables de entorno validadas correctamente");
        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Error de validación de variables de entorno:");
            console.error("\nVariables faltantes o inválidas:");
            error.errors.forEach((err) => {
                const path = err.path.join(".");
                console.error(`  - ${path}: ${err.message}`);
            });
            console.error("\nPor favor, verifica tu archivo .env y asegúrate de que todas las variables requeridas estén configuradas.");
            process.exit(1);
        }
        throw error;
    }
}

// Validar variables de entorno al importar el módulo
export const envs = validateEnv();

// Exportar tipo inferido del schema
export type EnvVars = z.infer<typeof envsSchema>;
