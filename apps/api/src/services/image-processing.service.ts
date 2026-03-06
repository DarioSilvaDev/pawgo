import sharp from "sharp";

// ─── Límites de seguridad de entrada ──────────────────────────────────────────
// Previenen decompression bombs (imágenes trampa que explotan el heap al decodificar)
const MAX_INPUT_PIXELS = 4000 * 4000; // 16MP máximo
const MAX_INPUT_SIZE_BYTES = 15 * 1024 * 1024; // 5MB

// ─── Configuración del pipeline de procesamiento ──────────────────────────────
export interface ImageProcessingOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    format: "webp";
    sizeBytes: number;
    originalSizeBytes: number;
    reductionPercent: number;
}

/**
 * ImageProcessingService
 *
 * Procesa imágenes de reseñas con sharp (binding nativo de libvips).
 * Pipeline: resize → WebP → strip EXIF → buffer
 *
 * Parámetros de producción decididos:
 *  - Max width/height: 1200px (suficiente para modal retina en ecommerce)
 *  - WebP quality: 82 (sweet spot — visualmente indistinguible del JPEG 90)
 *  - effort: 4 (balance velocidad/compresión — ~30-60ms por imagen en Render)
 *  - strip EXIF: sí (privacidad + reducción de peso)
 */
export class ImageProcessingService {
    /**
     * Procesa una imagen de reseña.
     * Input: cualquier buffer JPEG/PNG/WebP
     * Output: WebP optimizado con dimensiones máx. 1200px y sin metadatos
     */
    async processReviewImage(
        inputBuffer: Buffer,
        options: ImageProcessingOptions = {}
    ): Promise<ProcessedImage> {
        const { maxWidth = 1200, maxHeight = 1200, quality = 82 } = options;

        if (inputBuffer.length > MAX_INPUT_SIZE_BYTES) {
            throw new Error("La imagen supera el tamaño máximo de 5MB antes del procesamiento.");
        }

        const sharpInstance = sharp(inputBuffer, {
            limitInputPixels: MAX_INPUT_PIXELS, // rechaza imágenes > 16MP (anti-bomb)
            sequentialRead: true,               // más eficiente en memoria para lectura lineal
        });

        // Verificar que la imagen sea decodificable antes de procesar
        const metadata = await sharpInstance.metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error("No se pudo leer la imagen. El archivo puede estar corrupto.");
        }

        const result = await sharpInstance
            .resize(maxWidth, maxHeight, {
                fit: "inside",              // mantiene aspect ratio, no recorta
                withoutEnlargement: true,   // no agranda imágenes pequeñas
            })
            .webp({
                quality,                    // 82 = sweet spot calidad/peso para fotos de mascotas
                effort: 4,                  // 4 = equilibrio velocidad/compresión (escala 0-6)
                smartSubsample: true,       // mejor calidad en bordes con alto contraste
            })
            // sharp no incluye EXIF/GPS/metadatos por defecto al convertir — OK
            .toBuffer({ resolveWithObject: true });

        const reductionPercent = Math.round(
            (1 - result.info.size / inputBuffer.length) * 100
        );

        return {
            buffer: result.data,
            width: result.info.width,
            height: result.info.height,
            format: "webp",
            sizeBytes: result.info.size,
            originalSizeBytes: inputBuffer.length,
            reductionPercent,
        };
    }

    /**
     * Genera un thumbnail cuadrado (300×300, fit: cover) para uso en grilla.
     */
    async generateThumbnail(inputBuffer: Buffer): Promise<ProcessedImage> {
        const result = await sharp(inputBuffer, {
            limitInputPixels: MAX_INPUT_PIXELS,
        })
            .resize(300, 300, {
                fit: "cover",
                position: "center",
            })
            .webp({ quality: 75, effort: 3 })
            // sharp no incluye metadatos por defecto al convertir
            .toBuffer({ resolveWithObject: true });

        return {
            buffer: result.data,
            width: result.info.width,
            height: result.info.height,
            format: "webp",
            sizeBytes: result.info.size,
            originalSizeBytes: inputBuffer.length,
            reductionPercent: Math.round((1 - result.info.size / inputBuffer.length) * 100),
        };
    }
}
