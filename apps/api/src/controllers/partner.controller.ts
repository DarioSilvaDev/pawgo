import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import QRCode from "qrcode";
import { PartnerService } from "../services/partner.service.js";
import { envs } from "../config/envs.js";
import {
  CreatePartnerDto,
  CreatePartnerPointDto,
  CreatePartnerReferralSourceDto,
  CreatePartnerWholesaleSaleDto,
  UpdatePartnerDto,
  UpdatePartnerPointDto,
} from "../shared/index.js";

const createPartnerSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

const updatePartnerSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createPointSchema = z.object({
  name: z.string().min(2),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.record(z.any()).optional(),
  pickupEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updatePointSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.record(z.any()).optional(),
  pickupEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const createReferralSourceSchema = z.object({
  partnerPointId: z.string().optional(),
  sourceType: z.enum(["local_qr", "local_code"]).optional(),
  slug: z.string().min(2).max(80).optional(),
  code: z.string().min(2).max(50).optional(),
  landingTarget: z.string().min(2).max(80).optional(),
});

const createWholesaleSaleSchema = z.object({
  soldAt: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitWholesalePrice: z.number().nonnegative(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1),
});

const listPickupRequestsQuerySchema = z.object({
  status: z.enum(["awaiting_stock", "ready_notified", "cancelled"]).optional(),
});

const markPickupReadySchema = z.object({
  note: z.string().max(500).optional(),
});

const referralQrQuerySchema = z.object({
  format: z.enum(["png", "svg"]).default("png"),
  size: z.coerce.number().int().min(200).max(2048).default(900),
});

function assertAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const authUser = request.authUser as { role?: string } | undefined;
  if (!authUser || authUser.role !== "admin") {
    reply.status(403).send({ error: "Solo administradores" });
    return false;
  }
  return true;
}

export function createPartnerController(partnerService: PartnerService) {
  return {
    async listPickupPoints(_request: FastifyRequest, reply: FastifyReply) {
      const points = await partnerService.listPickupPoints();
      reply.send({ pickupPoints: points });
    },

    async resolveReferral(request: FastifyRequest, reply: FastifyReply) {
      const { slug } = request.params as { slug: string };
      const source = await partnerService.resolveReferralBySlug(slug);

      if (!source) {
        reply.status(404).send({
          valid: false,
          error: "Referencia no encontrada",
        });
        return;
      }

      reply.send({
        valid: true,
        referral: source,
      });
    },

    async getReferralQr(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { slug } = request.params as { slug: string };
        const { format, size } = referralQrQuerySchema.parse(request.query);

        const source = await partnerService.resolveReferralBySlug(slug);
        if (!source) {
          reply.status(404).send({ error: "Referencia no encontrada" });
          return;
        }

        const frontendBaseUrl = envs.FRONTEND_URL.replace(/\/+$/, "");
        const referralUrl = `${frontendBaseUrl}/r/${source.slug}`;
        const filenameBase = `pawgo-ref-${source.slug}`;

        if (format === "svg") {
          const svg = await QRCode.toString(referralUrl, {
            type: "svg",
            width: size,
            margin: 2,
            errorCorrectionLevel: "M",
          });

          reply
            .header("Content-Disposition", `attachment; filename=\"${filenameBase}.svg\"`)
            .type("image/svg+xml")
            .send(svg);
          return;
        }

        const pngDataUrl = await QRCode.toDataURL(referralUrl, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        const base64 = pngDataUrl.split(",")[1] || "";
        const pngBuffer = Buffer.from(base64, "base64");

        reply
          .header("Content-Disposition", `attachment; filename=\"${filenameBase}.png\"`)
          .type("image/png")
          .send(pngBuffer);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Parámetros inválidos", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async getAll(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      const partners = await partnerService.getAllPartners();
      reply.send({ partners });
    },

    async create(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const body = createPartnerSchema.parse(request.body);
        const partner = await partnerService.createPartner(body as CreatePartnerDto);
        reply.status(201).send(partner);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { id } = request.params as { id: string };
        const body = updatePartnerSchema.parse(request.body);
        const partner = await partnerService.updatePartner(id, body as UpdatePartnerDto);
        reply.send(partner);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async createPoint(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { id } = request.params as { id: string };
        const body = createPointSchema.parse(request.body);
        const point = await partnerService.createPartnerPoint(id, body as CreatePartnerPointDto);
        reply.status(201).send(point);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async updatePoint(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { pointId } = request.params as { pointId: string };
        const body = updatePointSchema.parse(request.body);
        const point = await partnerService.updatePartnerPoint(pointId, body as UpdatePartnerPointDto);
        reply.send(point);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async createReferralSource(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { id } = request.params as { id: string };
        const body = createReferralSourceSchema.parse(request.body);
        const source = await partnerService.createReferralSource(
          id,
          body as CreatePartnerReferralSourceDto
        );
        reply.status(201).send(source);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async listWholesaleSales(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      const { id } = request.params as { id?: string };
      const sales = await partnerService.listWholesaleSales(id);
      reply.send({ sales });
    },

    async createWholesaleSale(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { id } = request.params as { id: string };
        const body = createWholesaleSaleSchema.parse(request.body);
        const authUser = request.authUser as { authId?: string } | undefined;
        const sale = await partnerService.createWholesaleSale(
          id,
          body as CreatePartnerWholesaleSaleDto,
          authUser?.authId
        );
        reply.status(201).send(sale);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async listPickupRequests(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const query = listPickupRequestsQuerySchema.parse(request.query);
        const requests = await partnerService.listPickupRequests(query.status);
        reply.send({ requests });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },

    async markPickupReady(request: FastifyRequest, reply: FastifyReply) {
      if (!assertAdmin(request, reply)) return;
      try {
        const { id } = request.params as { id: string };
        const body = markPickupReadySchema.parse(request.body);
        const updated = await partnerService.markPickupReady(id, body.note);
        reply.send(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({ error: "Error de validación", details: error.errors });
          return;
        }
        throw error;
      }
    },
  };
}
