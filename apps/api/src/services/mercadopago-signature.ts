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
    const userAgent = request.headers["user-agent"] || "";

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
    // 2️⃣ Enforce Feed v2 user-agent
    // --------------------------------------------------
    if (!userAgent.includes("Feed")) {
        request.log.warn(
            { userAgent },
            "[Webhook] Unsupported notification type (not Feed v2)"
        );
        return { valid: false, reason: "not-feed-v2" };
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

    // merchant_order format
    if (body?.resource) {
        const segments = body.resource.split("/");
        dataId = segments[segments.length - 1];
    }

    // payment format
    if (!dataId && request.query) {
        const q = request.query as Record<string, string>;
        dataId = q["data.id"] || q["id"] || "";
    }

    if (!dataId) {
        return { valid: false, reason: "missing-data-id" };
    }

    // --------------------------------------------------
    // 5️⃣ Build manifest
    // --------------------------------------------------
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // --------------------------------------------------
    // 6️⃣ Compute HMAC SHA256
    // --------------------------------------------------
    const computedHash = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(manifest)
        .digest("hex");

    // --------------------------------------------------
    // 7️⃣ Constant-time comparison
    // --------------------------------------------------
    const isValid =
        computedHash.length === receivedHash.length &&
        crypto.timingSafeEqual(
            Buffer.from(computedHash),
            Buffer.from(receivedHash)
        );

    if (!isValid) {
        request.log.warn(
            {
                manifest,
                dataId,
            },
            "[Webhook] HMAC verification failed"
        );
        return { valid: false, reason: "hmac-mismatch" };
    }

    request.log.info(
        { dataId },
        "[Webhook] Signature verification PASSED"
    );

    return { valid: true, dataId };
}