import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { envs } from "../config/envs.js";

/**
 * Tipos de documento soportados por el sistema
 */
export type DocumentType = "INVOICES" | "PAYMENT_PROOFS" | "CONTENT" | "PRODUCTS" | "REVIEW_IMAGES";

/**
 * Configuración para cada tipo de documento
 */
interface DocumentTypeConfig {
  folder: string;
  allowedMimeTypes: string[];
  maxFileSize: number; // en bytes
  description: string;
}

/**
 * Mapa centralizado de configuración de tipos de documento.
 * Esto permite agregar o modificar tipos sin cambiar la lógica del servicio.
 */
const DOCUMENT_TYPE_CONFIG: Record<DocumentType, DocumentTypeConfig> = {
  INVOICES: {
    folder: "facturas",
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: "facturas",
  },
  PAYMENT_PROOFS: {
    folder: "comprobantes",
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: "comprobantes de pago",
  },
  CONTENT: {
    folder: "contenido",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"],
    maxFileSize: 15 * 1024 * 1024, // 15MB para contenido de influencers
    description: "contenido multimedia",
  },
  PRODUCTS: {
    folder: "productos",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    maxFileSize: 5 * 1024 * 1024, // 5MB para imágenes de productos
    description: "imágenes de productos",
  },
  REVIEW_IMAGES: {
    folder: "resenas",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    maxFileSize: 5 * 1024 * 1024, // 5MB para fotos de mascotas
    description: "fotos de reseñas de mascotas",
  },
};

/**
 * Resultado de una carga de archivo exitosa
 */
export interface UploadResult {
  filename: string;
  key: string;
  size: number;
  mimeType: string;
}

/**
 * Parámetros para la carga genérica de archivos
 */
export interface UploadParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  authId: string;
  documentType: DocumentType;
}

/**
 * Parámetros para subir un archivo con un key pre-generado (ej: resenas/{reviewId}/medium.ext)
 */
export interface UploadWithKeyParams {
  buffer: Buffer;
  key: string;
  mimeType: string;
  documentType: DocumentType;
}

/**
 * StorageService - Servicio genérico de almacenamiento en Backblaze B2
 *
 * Responsabilidades:
 * - Validar archivos según configuración de tipo de documento
 * - Subir archivos a B2
 * - Generar URLs firmadas para acceso privado
 * - Eliminar archivos
 *
 * Este servicio NO contiene lógica de negocio ni dependencias de base de datos.
 * La lógica de actualización de entidades debe manejarse en los controladores.
 */
export class StorageService {
  private s3: S3Client;
  private bucket = envs.B2_BUCKET;
  private endpoint = `https://${envs.B2_ENDPOINT}`;

  constructor() {
    console.log("🔐 [StorageService] Configurando cliente S3 para B2...");

    this.s3 = new S3Client({
      region: envs.B2_REGION,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: envs.B2_KEY_ID,
        secretAccessKey: envs.B2_APP_KEY,
      },
      // forcePathStyle: true, // Requerido para compatibilidad con B2
    });
  }

  /**
   * Inicializa el servicio y verifica la conexión
   */
  async initialize(): Promise<void> {
    try {
      if (!envs.B2_KEY_ID || !envs.B2_APP_KEY || !envs.B2_BUCKET) {
        console.warn("⚠️ [StorageService] Credenciales B2 no configuradas. Las cargas de archivos fallarán.");
        return;
      }

      console.log(`🔌 [StorageService] Conexión configurada a ${this.endpoint}`);
      console.log(`✅ [StorageService] Backblaze B2 inicializado (Región: ${envs.B2_REGION})`);
    } catch (error) {
      console.error("❌ [StorageService] Error al inicializar B2:", error);
      console.warn("⚠️ [StorageService] Continuando sin almacenamiento B2.");
    }
  }

  /**
   * Obtiene la configuración para un tipo de documento
   */
  getDocumentTypeConfig(type: DocumentType): DocumentTypeConfig {
    const config = DOCUMENT_TYPE_CONFIG[type];
    if (!config) {
      throw new Error(`Tipo de documento no soportado: ${type}`);
    }
    return config;
  }

  /**
   * Valida un archivo contra la configuración de su tipo de documento
   */
  validateFile(buffer: Buffer, mimeType: string, documentType: DocumentType): void {
    const config = this.getDocumentTypeConfig(documentType);

    // Validar tamaño
    if (buffer.length > config.maxFileSize) {
      const maxMB = config.maxFileSize / 1024 / 1024;
      throw new Error(`El archivo excede el tamaño máximo permitido (${maxMB}MB) para ${config.description}.`);
    }

    // Validar tipo MIME
    if (!config.allowedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Tipo de archivo no permitido para ${config.description}. Tipos válidos: ${config.allowedMimeTypes.join(", ")}`
      );
    }
  }

  /**
   * Genera un nombre de archivo único para almacenamiento
   */
  private generateKey(authId: string, originalName: string, folder: string): string {
    const timestamp = Date.now();
    const safeAuthId = authId || "anonymous";
    // Sanitizar el nombre original para evitar caracteres problemáticos
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${folder}/${safeAuthId}-${timestamp}-${safeName}`;
  }

  /**
   * Genera un key predecible y sin PII para imágenes de reseñas.
   * Formato: resenas/{reviewId}/medium.webp (o la extensión recibida)
   * Permite identificar y borrar fácilmente imágenes al moderar reseñas.
   */
  generateReviewImageKey(reviewId: string, filename: string): string {
    // Extraer extensión del nombre original; si no hay, usar 'jpg'
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    return `resenas/${reviewId}/medium.${safeExt}`;
  }

  /**
   * Sube un archivo a Backblaze B2
   */
  private async uploadToB2(buffer: Buffer, key: string, mimeType: string): Promise<void> {
    if (!this.bucket) {
      throw new Error("B2_BUCKET no está configurado");
    }

    console.log(`📤 [StorageService] Subiendo archivo: ${key} (${buffer.length} bytes)`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length, // B2 requiere ContentLength explícito
      });

      const response = await this.s3.send(command);
      console.log(`✅ [StorageService] Archivo subido exitosamente. ETag: ${response.ETag}`);
    } catch (error) {
      console.error("❌ [StorageService] Error al subir archivo a B2:");
      console.error("  - Key:", key);
      console.error("  - Error:", error instanceof Error ? error.message : String(error));
      throw new Error(`Error al subir archivo: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  }

  /**
   * Método genérico para subir un archivo.
   * Valida, genera el key y sube a B2.
   * Retorna información del archivo subido SIN efectos secundarios en DB.
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    const { buffer, originalName, mimeType, authId, documentType } = params;

    // 1. Validar archivo
    this.validateFile(buffer, mimeType, documentType);

    // 2. Obtener configuración y generar key
    const config = this.getDocumentTypeConfig(documentType);
    const key = this.generateKey(authId, originalName, config.folder);

    // 3. Subir a B2
    await this.uploadToB2(buffer, key, mimeType);

    // 4. Retornar resultado (sin lógica de negocio)
    return {
      filename: originalName,
      key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Sube un archivo con un key pre-generado (sin necesidad de authId).
   * Útil cuando el key se calcula externamente (ej: resenas/{reviewId}/medium.ext).
   * Valida el archivo según el tipo de documento antes de subir.
   */
  async uploadWithKey(params: UploadWithKeyParams): Promise<UploadResult> {
    const { buffer, key, mimeType, documentType } = params;

    // 1. Validar archivo contra la config del tipo de documento
    this.validateFile(buffer, mimeType, documentType);

    // 2. Subir a B2 con el key provisto
    await this.uploadToB2(buffer, key, mimeType);

    // 3. Extraer el filename del key para el resultado
    const filename = key.split("/").pop() ?? key;

    return {
      filename,
      key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Genera una URL firmada para acceso temporal a un archivo privado.
   * Por defecto 7 días (604800s) para permitir caching en el browser.
   * Usar valores menores solo para documentos sensibles (facturas, comprobantes).
   */
  async getSignedUrl(key: string, expiresIn: number = 604800): Promise<string> {
    if (!this.bucket) {
      throw new Error("B2_BUCKET no está configurado");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Elimina un archivo de B2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      if (!this.bucket) {
        throw new Error("B2_BUCKET no está configurado");
      }

      // Extraer el key si se proporciona una URL completa
      let fileKey = key;
      if (key.startsWith("http")) {
        const urlParts = key.split("/");
        const keyIndex = urlParts.findIndex((part) => part === this.bucket);
        if (keyIndex !== -1 && urlParts[keyIndex + 1]) {
          fileKey = urlParts.slice(keyIndex + 1).join("/");
        } else {
          const pathMatch = key.match(/\/file\/[^/]+\/(.+)$/);
          if (pathMatch) {
            fileKey = pathMatch[1];
          }
        }
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3.send(command);
      console.log(`🗑️ [StorageService] Archivo eliminado: ${fileKey}`);
    } catch (error) {
      // No lanzar error si el archivo no existe
      console.warn("⚠️ [StorageService] Error al eliminar archivo:", key, error);
    }
  }

  /**
   * Construye la URL pública de un archivo (si el bucket es público)
   */
  getPublicUrl(key: string): string {
    if (key.startsWith("http")) {
      return key;
    }
    // Formato de URL pública de B2
    return `https://f002.backblazeb2.com/file/${this.bucket}/${key}`;
  }
}
