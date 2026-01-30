import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3001";

// Tipos de archivos permitidos
const ALLOWED_MIME_TYPES = {
  invoice: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  paymentProof: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  content: ["image/jpeg", "image/png", "image/jpg", "image/gif"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export class StorageService {
  /**
   * Initialize upload directory
   */
  async initialize() {
    try {
      await fs.mkdir(path.join(UPLOAD_DIR, "invoices"), { recursive: true });
      await fs.mkdir(path.join(UPLOAD_DIR, "payment-proofs"), {
        recursive: true,
      });
      await fs.mkdir(path.join(UPLOAD_DIR, "content"), { recursive: true });
      console.log("✅ Upload directories initialized");
    } catch (error) {
      console.error("Error initializing upload directories:", error);
      throw error;
    }
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = randomBytes(8).toString("hex");
    return `${name}-${timestamp}-${random}${ext}`;
  }

  /**
   * Validate file
   */
  private validateFile(
    mimeType: string,
    size: number,
    fileType: "invoice" | "paymentProof" | "content"
  ): void {
    // Check size
    if (size > MAX_FILE_SIZE) {
      throw new Error(
        `El archivo es demasiado grande. Tamaño máximo: ${
          MAX_FILE_SIZE / 1024 / 1024
        }MB`
      );
    }

    // Check MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[fileType];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(
        `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Save file to disk
   */
  private async saveFile(
    buffer: Buffer,
    filename: string,
    subfolder: string
  ): Promise<string> {
    const filePath = path.join(UPLOAD_DIR, subfolder, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Upload invoice file
   */
  async uploadInvoice(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length, "invoice");
    const filename = this.generateFilename(originalName);
    const filePath = await this.saveFile(buffer, filename, "invoices");
    const url = `${PUBLIC_URL}/uploads/invoices/${filename}`;

    return {
      filename,
      url,
      path: filePath,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Upload payment proof file
   */
  async uploadPaymentProof(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length, "paymentProof");
    const filename = this.generateFilename(originalName);
    const filePath = await this.saveFile(buffer, filename, "payment-proofs");
    const url = `${PUBLIC_URL}/uploads/payment-proofs/${filename}`;

    return {
      filename,
      url,
      path: filePath,
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
    mimeType: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length, "content");
    const filename = this.generateFilename(originalName);
    const filePath = await this.saveFile(buffer, filename, "content");
    const url = `${PUBLIC_URL}/uploads/content/${filename}`;

    return {
      filename,
      url,
      path: filePath,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
      console.warn("Error deleting file:", filePath, error);
    }
  }

  /**
   * Get file URL from path
   */
  getFileUrl(filePath: string): string {
    if (filePath.startsWith("http")) {
      return filePath; // Already a URL
    }
    const relativePath = path.relative(UPLOAD_DIR, filePath);
    return `${PUBLIC_URL}/uploads/${relativePath.replace(/\\/g, "/")}`;
  }
}
