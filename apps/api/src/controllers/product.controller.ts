import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ProductService } from "../services/product.service.js";

const createProductSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  basePrice: z.number().positive("El precio debe ser positivo"),
  launchPrice: z
    .number()
    .positive("El precio de lanzamiento debe ser positivo")
    .optional()
    .nullable(),
  cashPrice: z.number().positive("El precio contado debe ser positivo"),
  currency: z.string().optional().default("ARS"),
  // Images are stored as storage keys. The API may also receive URLs (signed/public) and will normalize.
  images: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional().default(true),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        size: z.string().optional(),
        price: z.number().positive(),
        cashPrice: z.number().positive().optional(),
        stock: z.number().int().nonnegative().optional(),
        sku: z.string().optional(),
        isActive: z.boolean().optional().default(true),
      })
    )
    .optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  basePrice: z.number().positive().optional(),
  launchPrice: z
    .number()
    .positive("El precio de lanzamiento debe ser positivo")
    .optional()
    .nullable(),
  cashPrice: z.number().positive("El precio contado debe ser positivo").optional(),
  currency: z.string().optional(),
  // Images are stored as storage keys. The API may also receive URLs (signed/public) and will normalize.
  images: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});

const createVariantSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  size: z.string().optional(),
  price: z.number().positive("El precio debe ser positivo").optional(),
  cashPrice: z.number().positive("El precio contado debe ser positivo").optional(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  size: z.string().optional(),
  price: z.number().positive().optional(),
  cashPrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class ProductController {
  constructor(private readonly productService: ProductService) { }

  /**
   * Get all products
   * GET /api/products
   */
  getAll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        isActive?: string;
        search?: string;
      };

      const filters: {
        isActive?: boolean;
        search?: string;
      } = {};

      if (query.isActive !== undefined) {
        filters.isActive = query.isActive === "true";
      }

      if (query.search) {
        filters.search = query.search;
      }

      const products = await this.productService.getAll(filters);
      reply.send({ products });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: error.message,
        });
        return;
      }
      throw error;
    }
  };

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const product = await this.productService.getById(id);

      if (!product) {
        reply.status(404).send({
          error: "Producto no encontrado",
        });
        return;
      }

      reply.send(product);
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: error.message,
        });
        return;
      }
      throw error;
    }
  };

  /**
   * Create product
   * POST /api/products
   */
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createProductSchema.parse(request.body);
      const product = await this.productService.create(body);

      reply.status(201).send(product);
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
  };

  /**
   * Update product
   * PATCH /api/products/:id
   */
  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateProductSchema.parse(request.body);
      const product = await this.productService.update(id, body);

      reply.send(product);
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
  };

  /**
   * Delete product (soft delete)
   * DELETE /api/products/:id
   */
  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await this.productService.delete(id);

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
  };

  /**
   * Create product variant
   * POST /api/products/:productId/variants
   */
  createVariant = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string };
      const body = createVariantSchema.parse(request.body);
      const variant = await this.productService.createVariant(productId, body);

      reply.status(201).send(variant);
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
  };

  /**
   * Update product variant
   * PATCH /api/products/variants/:variantId
   */
  updateVariant = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { variantId } = request.params as { variantId: string };
      const body = updateVariantSchema.parse(request.body);
      const variant = await this.productService.updateVariant(variantId, body);

      reply.send(variant);
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
  };

  /**
   * Delete product variant
   * DELETE /api/products/variants/:variantId
   */
  deleteVariant = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { variantId } = request.params as { variantId: string };
      await this.productService.deleteVariant(variantId);

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
  };
}
