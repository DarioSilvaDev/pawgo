import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { influencerService } from "../services/influencer.service.js";
import { CommissionService } from "../services/commission.service.js";
import { JwtPayload } from "../../../../packages/shared/dist/index.js";
import { CommissionStatus } from "@prisma/client";

const commissionService = new CommissionService();

const getCommissionsQuerySchema = z.object({
  status: z.enum(["pending", "paid", "cancelled"]).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const influencerController = {
  /**
   * Get influencer dashboard
   * GET /api/influencers/me/dashboard
   */
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.authUser as JwtPayload | undefined;
      if (!user || !user.entityId || user.role !== "influencer") {
        reply.status(403).send({
          error: "Solo los influencers pueden acceder a este recurso",
        });
        return;
      }

      const dashboard = await influencerService.getDashboard(user.entityId);

      reply.send(dashboard);
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

  /**
   * Get influencer commissions
   * GET /api/influencers/me/commissions
   */
  async getCommissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.authUser as JwtPayload | undefined;
      if (!user || !user.entityId || user.role !== "influencer") {
        reply.status(403).send({
          error: "Solo los influencers pueden acceder a este recurso",
        });
        return;
      }

      const query = getCommissionsQuerySchema.parse(request.query);

      const filters: {
        status?: CommissionStatus;
        startDate?: Date;
        endDate?: Date;
      } = {};
      if (query.status) {
        filters.status = query.status as CommissionStatus;
      }
      if (query.startDate) {
        filters.startDate = new Date(query.startDate);
      }
      if (query.endDate) {
        filters.endDate = new Date(query.endDate);
      }

      const commissions = await influencerService.getCommissions(
        user.entityId,
        filters
      );

      reply.send({ commissions });
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

  /**
   * Get influencer discount codes
   * GET /api/influencers/me/discount-codes
   */
  async getDiscountCodes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.authUser as JwtPayload | undefined;
      if (!user || !user.entityId || user.role !== "influencer") {
        reply.status(403).send({
          error: "Solo los influencers pueden acceder a este recurso",
        });
        return;
      }

      const codes = await influencerService.getDiscountCodes(user.entityId);

      reply.send({ codes });
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

  /**
   * Get influencer profile
   * GET /api/influencers/me
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.authUser as JwtPayload | undefined;
      if (!user || !user.entityId || user.role !== "influencer") {
        reply.status(403).send({
          error: "Solo los influencers pueden acceder a este recurso",
        });
        return;
      }

      const influencer = await influencerService.getById(user.entityId);

      if (!influencer) {
        reply.status(404).send({
          error: "Influencer no encontrado",
        });
        return;
      }

      reply.send({
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth.email,
        phone: influencer.phone,
        socialMedia: influencer.socialMedia,
        isActive: influencer.isActive,
        paymentMethod: influencer.paymentMethod,
        accountNumber: influencer.accountNumber,
        cvu: influencer.cvu,
        bankName: influencer.bankName,
        mercadopagoEmail: influencer.mercadopagoEmail,
        taxId: influencer.taxId,
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
      });
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

  /**
   * Get all influencers (Admin only)
   * GET /api/influencers
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const influencers = await influencerService.getAll();
      reply.send(
        influencers.map((inf) => ({
          id: inf.id,
          name: inf.name,
          email: inf.auth.email,
          phone: inf.phone || undefined,
          socialMedia: inf.socialMedia,
          isActive: inf.isActive,
          emailVerified: inf.auth.emailVerified,
          createdAt: inf.createdAt,
          updatedAt: inf.updatedAt,
        }))
      );
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

  /**
   * Get commissions for a specific influencer (Admin only)
   * GET /api/influencers/:id/commissions
   */
  async getCommissionsByInfluencer(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params as { id: string };
      const query = getCommissionsQuerySchema.parse(request.query);

      const filters: {
        status?: CommissionStatus;
        startDate?: Date;
        endDate?: Date;
      } = {};
      if (query.status) {
        filters.status = query.status as CommissionStatus;
      }
      if (query.startDate) {
        filters.startDate = new Date(query.startDate);
      }
      if (query.endDate) {
        filters.endDate = new Date(query.endDate);
      }

      const commissions = await commissionService.getByInfluencer(id, filters);

      reply.send(commissions);
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

  /**
   * Create influencer (admin only)
   * POST /api/influencers
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const createInfluencerSchema = z.object({
        email: z.string().email("Email inválido"),
        password: z
          .string()
          .min(8, "La contraseña debe tener al menos 8 caracteres"),
        name: z.string().min(1, "El nombre es requerido"),
        phone: z.string().nullable().optional(),
        socialMedia: z.record(z.string(), z.unknown()).nullable().optional(),
      });

      const body = createInfluencerSchema.parse(request.body);

      const influencer = await influencerService.create(body);

      reply.status(201).send({
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth.email,
        phone: influencer.phone || undefined,
        socialMedia: influencer.socialMedia,
        isActive: influencer.isActive,
        emailVerified: influencer.auth.emailVerified,
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
      });
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

  /**
   * Update influencer (admin only)
   * PUT /api/influencers/:id
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const updateInfluencerSchema = z.object({
        name: z.string().min(1, "El nombre es requerido").optional(),
        phone: z.string().nullable().optional(),
        socialMedia: z.record(z.string(), z.unknown()).nullable().optional(),
        isActive: z.boolean().optional(),
      });

      const body = updateInfluencerSchema.parse(request.body);

      const influencer = await influencerService.update(id, body);

      reply.send({
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth.email,
        phone: influencer.phone || undefined,
        socialMedia: influencer.socialMedia,
        isActive: influencer.isActive,
        emailVerified: influencer.auth.emailVerified,
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
      });
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

  /**
   * Delete influencer (admin only) - soft delete
   * DELETE /api/influencers/:id
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await influencerService.delete(id);

      reply.status(204).send();
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

  /**
   * Get influencer by ID (admin only)
   * GET /api/influencers/:id
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const influencer = await influencerService.getById(id);

      if (!influencer) {
        reply.status(404).send({
          error: "Influencer no encontrado",
        });
        return;
      }

      reply.send({
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth.email,
        phone: influencer.phone || undefined,
        socialMedia: influencer.socialMedia,
        isActive: influencer.isActive,
        paymentMethod: influencer.paymentMethod,
        accountNumber: influencer.accountNumber || undefined,
        cvu: influencer.cvu || undefined,
        bankName: influencer.bankName || undefined,
        mercadopagoEmail: influencer.mercadopagoEmail || undefined,
        taxId: influencer.taxId || undefined,
        emailVerified: influencer.auth.emailVerified,
        createdAt: influencer.createdAt,
        updatedAt: influencer.updatedAt,
      });
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

  /**
   * Update payment information for current influencer
   * PUT /api/influencers/me/payment-info
   */
  async updatePaymentInfo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.authUser as JwtPayload | undefined;
      if (!user || !user.entityId || user.role !== "influencer") {
        reply.status(403).send({
          error: "Solo los influencers pueden acceder a este recurso",
        });
        return;
      }

      const updatePaymentInfoSchema = z.object({
        paymentMethod: z.enum(["transfer", "mercadopago"]).optional(),
        accountNumber: z.string().nullable().optional(),
        cvu: z.string().nullable().optional(),
        bankName: z.string().nullable().optional(),
        mercadopagoEmail: z.string().email().nullable().optional(),
        taxId: z
          .string()
          .nullable()
          .optional()
          .refine(
            (val) => {
              // Si es null o undefined, es válido (opcional)
              if (!val) return true;
              // Validar formato: xx-xxxxxxxx-x (2 dígitos, guión, 8 dígitos, guión, 1 dígito)
              const taxIdRegex = /^\d{2}-\d{8}-\d{1}$/;
              return taxIdRegex.test(val);
            },
            {
              message: "El CUIT/CUIL debe tener el formato: XX-XXXXXXXX-X",
            }
          ),
      });

      const body = updatePaymentInfoSchema.parse(request.body);

      // Validate that if paymentMethod is "transfer", at least one of accountNumber, cvu, or bankName is provided
      if (body.paymentMethod === "transfer") {
        if (
          !body.accountNumber &&
          !body.cvu &&
          !body.bankName &&
          !request.body
        ) {
          // If updating, check existing data
          const existing = await influencerService.getById(user.entityId);
          if (
            !existing?.accountNumber &&
            !existing?.cvu &&
            !existing?.bankName
          ) {
            reply.status(400).send({
              error:
                "Para transferencia bancaria, debe proporcionar al menos número de cuenta, CVU o banco",
            });
            return;
          }
        }
      }

      // Validate that if paymentMethod is "mercadopago", mercadopagoEmail is provided
      if (body.paymentMethod === "mercadopago") {
        if (!body.mercadopagoEmail && !request.body) {
          const existing = await influencerService.getById(user.entityId);
          if (!existing?.mercadopagoEmail) {
            reply.status(400).send({
              error:
                "Para MercadoPago, debe proporcionar el email de MercadoPago",
            });
            return;
          }
        }
      }

      const updated = await influencerService.updatePaymentInfo(
        user.entityId,
        body
      );

      reply.send({
        id: updated.id,
        paymentMethod: updated.paymentMethod,
        accountNumber: updated.accountNumber,
        cvu: updated.cvu,
        bankName: updated.bankName,
        mercadopagoEmail: updated.mercadopagoEmail,
        taxId: updated.taxId,
      });
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
};
