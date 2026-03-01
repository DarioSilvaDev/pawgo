import crypto from "crypto";
import { FastifyRequest } from "fastify";
import { envs } from "../config/envs.js";

const WEBHOOK_SECRET = envs.MERCADOPAGO_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
    throw new Error("Missing MERCADOPAGO_WEBHOOK_SECRET environment variable");
}

interface VerificationResult {
    valid: boolean;
    dataId?: string;
    reason?: string;
    isPanelTest?: boolean;
}

export function verifyMercadoPagoSignature(
    request: FastifyRequest
): VerificationResult {
    const xSignature = request.headers["x-signature"];
    const xRequestId = request.headers["x-request-id"];

    const body = request.body as any;

    // --------------------------------------------------
    // 1️⃣ Allow MercadoPago panel test (no signature)
    // --------------------------------------------------
    if (!xSignature || !xRequestId) {
        if (body?.api_version === "v1" && body?.action) {
            request.log.info("[Webhook] MercadoPago panel test detected");
            return { valid: true, isPanelTest: true };
        }

        request.log.warn(
            "[Webhook] Missing x-signature or x-request-id headers"
        );
        return { valid: false, reason: "missing-headers" };
    }

    if (typeof xSignature !== "string" || typeof xRequestId !== "string") {
        return { valid: false, reason: "invalid-headers-type" };
    }

    // --------------------------------------------------
    // 3️⃣ Extract ts and v1 hash
    // --------------------------------------------------
    const parts = xSignature.split(",");
    let ts: string | undefined;
    let receivedHash: string | undefined;

    for (const part of parts) {
        const [key, value] = part.split("=", 2).map((s) => s.trim());
        if (key === "ts") ts = value;
        if (key === "v1") receivedHash = value;
    }

    if (!ts || !receivedHash) {
        return { valid: false, reason: "invalid-signature-format" };
    }

    // --------------------------------------------------
    // 4️⃣ Extract dataId consistently
    // --------------------------------------------------
    let dataId = "";

    // payment format
    if (request.query) {
        const q = request.query as Record<string, string>;
        dataId = q["data.id"] || q["id"] || "";
    }

    if (!dataId) {
        return { valid: false, reason: "missing-data-id" };
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const computedBuffer = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(manifest)
        .digest();

    const receivedBuffer = Buffer.from(receivedHash, "hex");

    if (computedBuffer.length !== receivedBuffer.length) {
        return { valid: false };
    }

    const isValid = crypto.timingSafeEqual(computedBuffer, receivedBuffer);

    if (isValid) {
        request.log.info(
            { dataId },
            "[Webhook] Signature verification PASSED"
        );
        return { valid: true, dataId };
    }

    request.log.warn(
        { manifest, dataId },
        "[Webhook] HMAC verification failed"
    );
    return { valid: false, reason: "hmac-mismatch" };
}