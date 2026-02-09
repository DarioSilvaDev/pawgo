import { FastifyInstance } from "fastify";
import { UploadController } from "../controllers/upload.controller.js";
import { StorageService } from "../services/storage.service.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { createAuthMiddleware, requireRole } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";
import { UserRole } from "../../../../packages/shared/dist/index.js";

export async function uploadRoutes(
  fastify: FastifyInstance,
  options: {
    storageService: StorageService;
    influencerPaymentService: InfluencerPaymentService;
    tokenService: TokenService;
    uploadController: UploadController;
  }
) {
  const { uploadController, tokenService } = options;
  const authenticate = createAuthMiddleware(tokenService);
  const requireAdmin = requireRole(UserRole.ADMIN);

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
      preHandler: [authenticate, requireAdmin],
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

  // Upload product image (admin only)
  fastify.post(
    "/upload/product-image",
    {
      preHandler: [authenticate, requireAdmin],
    },
    uploadController.uploadProductImage
  );

  // Download file
  fastify.get(
    "/upload/download",
    {
      preHandler: authenticate,
    },
    uploadController.download
  );
}
