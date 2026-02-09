import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  CreateInfluencerPaymentDto,
  UpdateInfluencerPaymentDto,
  JwtPayload,
} from "../../../../packages/shared/dist/index.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { InfluencerPaymentStatus } from "@prisma/client";
import { StorageService } from "../services/storage.service.js";

// Validation schemas
const createPaymentSchema = z.object({
  influencerId: z.string().min(1, "Influencer ID es requerido"),
  commissionIds: z.array(z.string()).min(1, "Debe haber al menos una comisión"),
  paymentMethod: z.enum(["transfer", "mercadopago"], {
    errorMap: () => ({
      message: "Método de pago debe ser 'transfer' o 'mercadopago'",
    }),
  }),
});

const updatePaymentSchema = z.object({
  invoiceUrl: z.string().url().optional(),
  paymentProofUrl: z.string().url().optional(),
  contentLinks: z.array(z.string().url()).optional(),
  invoiceRejectionReason: z
    .string()
    .min(3, "El motivo debe tener al menos 3 caracteres")
    .max(500, "El motivo no puede tener más de 500 caracteres")
    .optional(),
  status: z
    .enum([
      "pending",
      "invoice_uploaded",
      "invoice_rejected",
      "approved",
      "paid",
      "cancelled",
    ])
    .optional(),
}).superRefine((val, ctx) => {
  if (val.status === "invoice_rejected" && !val.invoiceRejectionReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debes indicar un motivo/observación para rechazar la factura",
      path: ["invoiceRejectionReason"],
    });
  }
});

const influencerPaymentService = new InfluencerPaymentService(new StorageService());

export function createInfluencerPaymentController() {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = createPaymentSchema.parse(request.body);
        const payment = await influencerPaymentService.create(
          body as CreateInfluencerPaymentDto
        );
        reply.status(201).send(payment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getById(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const payment = await influencerPaymentService.getById(id);

        if (!payment) {
          reply.status(404).send({
            error: "Pago no encontrado",
          });
          return;
        }

        reply.send(payment);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getAll(request: FastifyRequest, reply: FastifyReply) {
      try {
        const query = request.query as {
          influencerId?: string;
          status?: string;
        };

        const payments = await influencerPaymentService.getAll({
          influencerId: query.influencerId,
          status: query.status as InfluencerPaymentStatus | undefined,
        });

        reply.send(payments);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getByInfluencer(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as JwtPayload | undefined;

        // Debug logging
        console.log("getByInfluencer - User:", {
          role: user?.role,
          entityId: user?.entityId,
          email: user?.email,
        });

        if (!user || user.role !== "influencer" || !user.entityId) {
          reply.status(403).send({
            error: "Solo los influencers pueden acceder a sus pagos",
            debug: {
              hasUser: !!user,
              role: user?.role,
              entityId: user?.entityId,
            },
          });
          return;
        }

        // Get influencer ID from user context
        const payments = await influencerPaymentService.getByInfluencer(
          user.entityId
        );

        console.log(
          `getByInfluencer - Found ${payments.length} payments for influencer ${user.entityId}`
        );

        reply.send(payments);
      } catch (error) {
        console.error("getByInfluencer - Error:", error);
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const body = updatePaymentSchema.parse(request.body);
        const user = request.authUser as JwtPayload | undefined;

        const payment = await influencerPaymentService.update(
          id,
          body as UpdateInfluencerPaymentDto,
          user?.entityId,
          user?.role,
          user?.authId
        );

        reply.send(payment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async cancel(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const payment = await influencerPaymentService.cancel(id);
        reply.send(payment);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },
  };
}
