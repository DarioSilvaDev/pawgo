import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from "../../../../packages/shared/dist/index.js";
import { DiscountCodeService } from "../services/discount-code.service.js";

// Validation schemas
const createDiscountCodeSchema = z.object({
  influencerId: z.string().min(1, "Influencer ID es requerido"),
  code: z
    .string()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(50, "El código no puede tener más de 50 caracteres")
    .regex(
      /^[A-Z0-9_-]+$/,
      "El código solo puede contener letras mayúsculas, números, guiones y guiones bajos"
    ),
  discountType: z.enum(["percentage", "fixed"], {
    errorMap: () => ({
      message: "Tipo de descuento debe ser 'percentage' o 'fixed'",
    }),
  }),
  discountValue: z
    .number()
    .positive("El valor del descuento debe ser positivo"),
  minPurchase: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  validUntil: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
});

const updateDiscountCodeSchema = z.object({
  code: z
    .string()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(50, "El código no puede tener más de 50 caracteres")
    .regex(
      /^[A-Z0-9_-]+$/,
      "El código solo puede contener letras mayúsculas, números, guiones y guiones bajos"
    )
    .optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  minPurchase: z.number().positive().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  validUntil: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional()
    .nullable(),
});

const querySchema = z.object({
  influencerId: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  code: z.string().optional(),
});

const validateCodeSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  subtotal: z.number().nonnegative("El subtotal debe ser mayor o igual a 0"),
});

export function createDiscountCodeController(
  discountCodeService: DiscountCodeService
) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = createDiscountCodeSchema.parse(request.body);
        const result = await discountCodeService.create(
          body as CreateDiscountCodeDto
        );
        reply.status(201).send(result);
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

    async getAll(request: FastifyRequest, reply: FastifyReply) {
      try {
        const query = querySchema.parse(request.query);
        const codes = await discountCodeService.getAll({
          influencerId: query.influencerId,
          isActive: query.isActive,
          code: query.code,
        });
        reply.send(codes);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        throw error;
      }
    },

    async getById(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const code = await discountCodeService.getById(id);

      if (!code) {
        reply.status(404).send({
          error: "Código de descuento no encontrado",
        });
        return;
      }

      reply.send(code);
    },

    async update(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const body = updateDiscountCodeSchema.parse(request.body);
        const result = await discountCodeService.update(
          id,
          body as UpdateDiscountCodeDto
        );
        reply.send(result);
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

    async delete(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        await discountCodeService.delete(id);
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
     * Validate discount code (public endpoint)
     */
    async validate(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = validateCodeSchema.parse(request.body);
        const result = await discountCodeService.validateCode(
          body.code,
          body.subtotal
        );

        if (!result.valid) {
          reply.status(400).send({
            valid: false,
            discountAmount: 0,
            error: result.error,
          });
          return;
        }

        reply.send({
          valid: true,
          discountAmount: result.discountAmount,
          discountCode: result.discountCode
            ? {
                id: result.discountCode.id,
                code: result.discountCode.code,
                discountType: result.discountCode.discountType,
                discountValue: result.discountCode.discountValue,
                influencer: result.discountCode.influencer
                  ? {
                      id: result.discountCode.influencer.id,
                      name: result.discountCode.influencer.name,
                    }
                  : undefined,
              }
            : undefined,
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
}
