import { FastifyInstance } from "fastify";
import { createPartnerController } from "../controllers/partner.controller.js";
import { PartnerService } from "../services/partner.service.js";
import { createAuthMiddleware } from "../auth/middleware/auth.middleware.js";
import { TokenService } from "../auth/services/token.service.js";

export async function partnerRoutes(
  fastify: FastifyInstance,
  options: {
    partnerService: PartnerService;
    tokenService: TokenService;
  }
) {
  const controller = createPartnerController(options.partnerService);
  const authenticate = createAuthMiddleware(options.tokenService);

  // Public
  fastify.get("/partners/pickup-points", controller.listPickupPoints);
  fastify.get("/partners/referrals/:slug", controller.resolveReferral);
  fastify.get("/partners/referrals/:slug/qr", controller.getReferralQr);

  // Admin
  fastify.get(
    "/partners",
    {
      preHandler: authenticate,
    },
    controller.getAll
  );

  fastify.post(
    "/partners",
    {
      preHandler: authenticate,
    },
    controller.create
  );

  fastify.patch(
    "/partners/:id",
    {
      preHandler: authenticate,
    },
    controller.update
  );

  fastify.post(
    "/partners/:id/points",
    {
      preHandler: authenticate,
    },
    controller.createPoint
  );

  fastify.patch(
    "/partners/points/:pointId",
    {
      preHandler: authenticate,
    },
    controller.updatePoint
  );

  fastify.post(
    "/partners/:id/referral-sources",
    {
      preHandler: authenticate,
    },
    controller.createReferralSource
  );

  fastify.get(
    "/partners/wholesale-sales",
    {
      preHandler: authenticate,
    },
    controller.listWholesaleSales
  );

  fastify.get(
    "/partners/:id/wholesale-sales",
    {
      preHandler: authenticate,
    },
    controller.listWholesaleSales
  );

  fastify.post(
    "/partners/:id/wholesale-sales",
    {
      preHandler: authenticate,
    },
    controller.createWholesaleSale
  );

  fastify.get(
    "/partners/pickup-requests",
    {
      preHandler: authenticate,
    },
    controller.listPickupRequests
  );

  fastify.post(
    "/partners/pickup-requests/:id/ready",
    {
      preHandler: authenticate,
    },
    controller.markPickupReady
  );
}
