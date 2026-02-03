import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { envs } from "../config/envs.js";

// Backblaze B2 Configuration (S3-compatible API)
const B2_APPLICATION_KEY_ID = envs.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = envs.B2_APPLICATION_KEY || envs.B2_APP_KEY;
const B2_BUCKET_NAME = envs.B2_BUCKET_NAME;
const B2_ENDPOINT_RAW = envs.B2_ENDPOINT || "https://s3.us-west-000.backblazeb2.com";
const B2_REGION = envs.B2_REGION || "us-west-000";
const B2_PUBLIC_URL_RAW = envs.B2_PUBLIC_URL || (envs.B2_ENDPOINT ? envs.B2_ENDPOINT.replace("s3.", "") : "");

// Normalize endpoints - remove protocol if present for S3 client
const B2_ENDPOINT = B2_ENDPOINT_RAW.replace(/^https?:\/\//, "");
const B2_PUBLIC_URL = B2_PUBLIC_URL_RAW.replace(/^https?:\/\//, "");

// Tipos de archivos permitidos
const ALLOWED_MIME_TYPES = {
  facturas: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  comprobantes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  contenido: ["image/jpeg", "image/png", "image/jpg", "image/gif"],
  productos: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

// Initialize S3 Client for Backblaze B2
// Note: endpoint should be a full URL with protocol
// We normalize it to ensure it's correct
let normalizedEndpoint = B2_ENDPOINT || "";
if (normalizedEndpoint && !normalizedEndpoint.startsWith("http://") && !normalizedEndpoint.startsWith("https://")) {
  normalizedEndpoint = `https://${normalizedEndpoint}`;
} else if (!normalizedEndpoint) {
  normalizedEndpoint = "https://s3.us-west-000.backblazeb2.com";
}

// Log credentials status (without exposing full values)
console.log("🔐 [StorageService] Configurando credenciales B2:");
console.log("  - B2_APPLICATION_KEY_ID:", B2_APPLICATION_KEY_ID ? `${B2_APPLICATION_KEY_ID.substring(0, 8)}...` : "NO CONFIGURADO");
console.log("  - B2_APP_KEY:", B2_APP_KEY ? `${B2_APP_KEY.substring(0, 8)}...` : "NO CONFIGURADO");
console.log("  - B2_BUCKET_NAME:", B2_BUCKET_NAME || "NO CONFIGURADO");
console.log("  - B2_ENDPOINT:", normalizedEndpoint);
console.log("  - B2_REGION:", B2_REGION);

const s3Client = new S3Client({
  endpoint: normalizedEndpoint,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_APPLICATION_KEY_ID || "",
    secretAccessKey: B2_APP_KEY || "",
  },
  forcePathStyle: true, // Required for Backblaze B2
});

export class StorageService {
  /**
   * Initialize storage service
   * Verifies connection to Backblaze B2
   */
  async initialize() {
    try {
      if (!B2_APPLICATION_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) {
        console.warn(
          "⚠️ Backblaze B2 credentials not configured. File uploads will fail."
        );
        return;
      }
      // Validate endpoint is a valid Backblaze B2 endpoint
      if (!B2_ENDPOINT.includes("backblazeb2.com") && !B2_ENDPOINT.includes("backblaze.com")) {
        console.warn(
          `⚠️ B2_ENDPOINT (${B2_ENDPOINT}) doesn't look like a valid Backblaze B2 endpoint. Expected format: s3.REGION.backblazeb2.com`
        );
      }

      console.log(`✅ Backblaze B2 storage initialized (endpoint: ${normalizedEndpoint})`);
    } catch (error) {
      console.error("Error initializing Backblaze B2 storage:", error);
      // Don't throw, allow server to start even if B2 is misconfigured
      console.warn("⚠️ Continuing without Backblaze B2 storage. File uploads will fail.");
    }
  }

  /**
   * Generate unique filename
   */
  private generateFilename(authId: string, originalName: string, subfolder: string): string {
    const ext = originalName.substring(originalName.lastIndexOf("."));
    const name = originalName.substring(0, originalName.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "-");
    const timestamp = Date.now().toString();
    return `${subfolder}/${name}-${authId}-${timestamp}.${ext}`;
  }

  /**
   * Validate file
   */
  private validateFile(
    mimeType: string,
    size: number,
    fileType: string
  ): void {
    // Check size
    if (size > MAX_FILE_SIZE) {
      throw new Error(
        `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024
        }MB`
      );
    }

    // Check MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[fileType as keyof typeof ALLOWED_MIME_TYPES];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(
        `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Upload file to Backblaze B2
   */
  private async uploadToB2(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<string> {
    console.log("☁️ [StorageService.uploadToB2] Preparando upload a Backblaze B2");
    console.log("  - Bucket:", B2_BUCKET_NAME);
    console.log("  - Key:", key);
    console.log("  - Content-Type:", mimeType);
    console.log("  - Endpoint:", normalizedEndpoint);

    if (!B2_BUCKET_NAME) {
      console.error("❌ [StorageService.uploadToB2] B2_BUCKET_NAME no está configurado");
      throw new Error("B2_BUCKET_NAME no está configurado");
    }

    try {
      const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      console.log("📤 [StorageService.uploadToB2] Enviando comando PutObject...");
      const commandStartTime = Date.now();
      await s3Client.send(command);
      const commandTime = Date.now() - commandStartTime;
      console.log(`✅ [StorageService.uploadToB2] Comando ejecutado en ${commandTime}ms`);

    } catch (error) {
      console.error("❌ [StorageService.uploadToB2] Error al subir archivo:");
      console.error("  - Tipo:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("  - Mensaje:", error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error("  - Stack:", error.stack);
      }
      throw error;
    }

    // Generate public URL
    // Backblaze B2 public URL format: https://f000.backblazeb2.com/file/bucket-name/key
    // Or if using custom domain: https://your-domain.com/key
    console.log("🔗 [StorageService.uploadToB2] Generando URL pública...");
    const publicUrl = B2_PUBLIC_URL_RAW.includes("backblazeb2.com")
      ? `https://${B2_PUBLIC_URL}/file/${B2_BUCKET_NAME}/${key}`
      : `https://${B2_PUBLIC_URL}/${key}`;

    console.log("  - URL generada:", publicUrl);
    return publicUrl;
  }

  /**
   * Get signed URL for private file access (if needed)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!B2_BUCKET_NAME) {
      throw new Error("B2_BUCKET_NAME no está configurado");
    }

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Upload invoice file
   */
  async uploadInvoice(
    buffer: Buffer,
    authId: string,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    const folder = this.mapTypeToFolder("INVOICES");
    this.validateFile(mimeType, buffer.length, folder);
    const key = this.generateFilename(authId, originalName, folder);
    const url = await this.uploadToB2(buffer, key, mimeType);

    return {
      filename: originalName,
      url,
      path: key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Upload payment proof file
   */
  async uploadPaymentProof(
    buffer: Buffer,
    authId: string,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length, this.mapTypeToFolder("PAYMENT_PROOFS") as "comprobantes");
    const key = this.generateFilename(authId, originalName, this.mapTypeToFolder("PAYMENT_PROOFS") || "");
    const url = await this.uploadToB2(buffer, key, mimeType);

    return {
      filename: originalName,
      url,
      path: key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Upload content file (screenshot, etc.)
   */
  async uploadContent(
    buffer: Buffer,
    originalName: string,
    authId: string,
    mimeType: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length, this.mapTypeToFolder("CONTENT") as "contenido");
    const key = this.generateFilename(authId, originalName, this.mapTypeToFolder("CONTENT") || "");
    const url = await this.uploadToB2(buffer, key, mimeType);

    return {
      filename: originalName,
      url,
      path: key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Delete file from Backblaze B2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      if (!B2_BUCKET_NAME) {
        throw new Error("B2_BUCKET_NAME no está configurado");
      }

      // If key is a full URL, extract the key part
      let fileKey = key;
      if (key.startsWith("http")) {
        // Extract key from URL
        const urlParts = key.split("/");
        const keyIndex = urlParts.findIndex((part) => part === B2_BUCKET_NAME);
        if (keyIndex !== -1 && urlParts[keyIndex + 1]) {
          fileKey = urlParts.slice(keyIndex + 1).join("/");
        } else {
          // Try to extract from path
          const pathMatch = key.match(/\/file\/[^/]+\/(.+)$/);
          if (pathMatch) {
            fileKey = pathMatch[1];
          }
        }
      }

      const command = new DeleteObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: fileKey,
      });

      await s3Client.send(command);
    } catch (error) {
      // File might not exist, log but don't throw
      console.warn("Error deleting file from B2:", key, error);
    }
  }

  /**
   * Get file URL from path/key
   */
  getFileUrl(key: string): string {
    if (key.startsWith("http")) {
      return key; // Already a URL
    }

    // Generate public URL
    const publicUrl = B2_PUBLIC_URL_RAW.includes("backblazeb2.com")
      ? `https://${B2_PUBLIC_URL}/file/${B2_BUCKET_NAME}/${key}`
      : `https://${B2_PUBLIC_URL}/${key}`;

    return publicUrl;
  }

  /**
   * Upload product image file
   */
  async uploadProductImage(
    buffer: Buffer,
    authId: string,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    console.log("📦 [StorageService.uploadProductImage] Iniciando subida");
    console.log("  - Original name:", originalName);
    console.log("  - MIME type:", mimeType);
    console.log("  - Size:", `${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log("  - Auth ID:", authId);

    const folder = this.mapTypeToFolder("PRODUCTS");
    console.log("  - Folder:", folder);

    console.log("✅ [StorageService.uploadProductImage] Validando archivo...");
    this.validateFile(mimeType, buffer.length, folder);
    console.log("  ✅ Validación exitosa");

    console.log("🔑 [StorageService.uploadProductImage] Generando filename único...");
    const key = this.generateFilename(authId, originalName, folder);
    console.log("  - Key generado:", key);

    console.log("☁️ [StorageService.uploadProductImage] Subiendo a Backblaze B2...");
    const b2StartTime = Date.now();
    const url = await this.uploadToB2(buffer, key, mimeType);
    const b2Time = Date.now() - b2StartTime;
    console.log(`✅ [StorageService.uploadProductImage] Subida a B2 completada en ${b2Time}ms`);
    console.log("  - URL pública:", url);

    const result = {
      filename: originalName,
      url,
      path: key,
      size: buffer.length,
      mimeType,
    };

    console.log("✅ [StorageService.uploadProductImage] Proceso completado");
    return result;
  }

  private mapTypeToFolder(type: string): string {
    const map: Record<string, string> = {
      INVOICES: "facturas",
      PAYMENT_PROOFS: "comprobantes",
      CONTENT: "contenido",
      PRODUCTS: "productos",
    };

    return map[type] || "";
  }
}
