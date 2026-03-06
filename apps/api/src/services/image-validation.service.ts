/**
 * ImageValidationService
 *
 * Validates image files by inspecting their magic bytes (binary signatures),
 * not just the declared MIME type. This prevents attackers from uploading
 * non-image files (e.g., executables) with a spoofed Content-Type header.
 */

// File signatures (magic bytes) for supported image formats
const IMAGE_SIGNATURES: Record<string, number[][]> = {
    "image/jpeg": [
        [0xff, 0xd8, 0xff, 0xe0], // JFIF
        [0xff, 0xd8, 0xff, 0xe1], // EXIF
        [0xff, 0xd8, 0xff, 0xdb], // JPEG with DQT
        [0xff, 0xd8, 0xff, 0xee], // JPEG with APP14
        [0xff, 0xd8, 0xff],       // Generic JPEG
    ],
    "image/jpg": [
        [0xff, 0xd8, 0xff],
    ],
    "image/png": [
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ],
    "image/webp": [
        // WebP: RIFF header + WEBP marker at bytes 8-11
        [0x52, 0x49, 0x46, 0x46], // "RIFF"
    ],
};

// GIF signatures — will be detected and rejected
const GIF_SIGNATURES = [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
];

export class ImageValidationService {
    /**
     * Validates that the binary content of the buffer matches the declared MIME type.
     * Throws an error if the file is not a valid image or if there is a type mismatch.
     *
     * @param buffer - Raw file buffer
     * @param declaredMimeType - MIME type declared by the client (e.g., "image/jpeg")
     */
    validateMagicBytes(buffer: Buffer, declaredMimeType: string): void {
        if (!buffer || buffer.length < 8) {
            throw new Error("El archivo es demasiado pequeño para ser una imagen válida.");
        }

        // First, check if it's a GIF (animated or otherwise — reject them)
        for (const sig of GIF_SIGNATURES) {
            if (sig.every((byte, i) => buffer[i] === byte)) {
                throw new Error("Los GIFs no están permitidos en reseñas.");
            }
        }

        const expectedSignatures = IMAGE_SIGNATURES[declaredMimeType];
        if (!expectedSignatures) {
            throw new Error(
                `Tipo de imagen no soportado: ${declaredMimeType}. Solo se permiten JPG, PNG y WebP.`
            );
        }

        // Special case for WebP: check RIFF header AND the WEBP marker at offset 8
        if (declaredMimeType === "image/webp") {
            const hasRiff = [0x52, 0x49, 0x46, 0x46].every((byte, i) => buffer[i] === byte);
            const hasWebp =
                buffer.length >= 12 &&
                buffer[8] === 0x57 && // W
                buffer[9] === 0x45 && // E
                buffer[10] === 0x42 && // B
                buffer[11] === 0x50;  // P

            if (!hasRiff || !hasWebp) {
                throw new Error(
                    "El archivo no es una imagen WebP válida. El contenido no coincide con el tipo declarado."
                );
            }
            return;
        }

        // For JPEG and PNG, check if at least one of the expected signatures matches
        const isValid = expectedSignatures.some((sig) =>
            sig.every((byte, i) => buffer[i] === byte)
        );

        if (!isValid) {
            throw new Error(
                "El archivo no es una imagen válida. El contenido binario no coincide con el tipo declarado."
            );
        }
    }

    /**
     * Returns the detected MIME type based on magic bytes.
     * Useful for logging or double-checking declared types.
     */
    detectMimeType(buffer: Buffer): string | null {
        if (!buffer || buffer.length < 8) return null;

        // PNG
        if ([0x89, 0x50, 0x4e, 0x47].every((byte, i) => buffer[i] === byte)) {
            return "image/png";
        }

        // JPEG
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return "image/jpeg";
        }

        // WebP (RIFF + WEBP marker)
        if (
            [0x52, 0x49, 0x46, 0x46].every((byte, i) => buffer[i] === byte) &&
            buffer.length >= 12 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
        ) {
            return "image/webp";
        }

        return null;
    }
}
