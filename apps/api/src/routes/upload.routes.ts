import { FastifyInstance } from "fastify";
import { createUploadController } from "../controllers/upload.controller.js";
import { StorageService } from "../services/storage.service.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { createAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";

export async function uploadRoutes(
  fastify: FastifyInstance,
  options: {
    storageService: StorageService;
    influencerPaymentService: InfluencerPaymentService;
    tokenService: TokenService;
  }
) {
  const { storageService, influencerPaymentService, tokenService } = options;
  const uploadController = createUploadController(
    storageService,
    influencerPaymentService
  );
  const authenticate = createAuthMiddleware(tokenService);

  // Upload invoice (influencer or admin)
  fastify.post(
    "/influencer-payments/:id/upload-invoice",
    {
      preHandler: authenticate,
    },
    uploadController.uploadInvoice
  );

  // Upload payment proof (admin only)
  fastify.post(
    "/influencer-payments/:id/upload-payment-proof",
    {
      preHandler: authenticate,
    },
    uploadController.uploadPaymentProof
  );

  // Upload content (influencer or admin)
  fastify.post(
    "/influencer-payments/:id/upload-content",
    {
      preHandler: authenticate,
    },
    uploadController.uploadContent
  );
}
