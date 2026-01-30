import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateProductDto {
  name: string;
  description: string;
  basePrice: number;
  launchPrice?: number | null; // Precio de lanzamiento (opcional, null para no establecer)
  currency?: string;
  images?: string[];
  isActive?: boolean;
  variants?: CreateProductVariantDto[];
}

export interface CreateProductVariantDto {
  name: string;
  size?: string;
  price?: number; // Opcional: si no se especifica, usará basePrice del producto
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  basePrice?: number;
  launchPrice?: number | null; // null para remover el precio de lanzamiento
  currency?: string;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProductVariantDto {
  name?: string;
  size?: string;
  price?: number;
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export class ProductService {
  /**
   * Get all products
   */
  async getAll(filters?: { isActive?: boolean; search?: string }) {
    const where: Prisma.ProductWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.product.findMany({
      where,
      include: {
        variants: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get product by ID
   */
  async getById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { name: "asc" },
        },
      },
    });
  }

  /**
   * Create product
   */
  async create(data: CreateProductDto) {
    // Validaciones de precio
    if (data.basePrice <= 0) {
      throw new Error("El precio base debe ser mayor a 0");
    }
    if (data.launchPrice != null && data.launchPrice !== undefined) {
      if (data.launchPrice <= 0) {
        throw new Error("El precio de lanzamiento debe ser mayor a 0");
      }
      if (data.launchPrice > data.basePrice) {
        throw new Error(
          "El precio de lanzamiento debe ser menor o igual al precio base"
        );
      }
    }
    // Validar precios de variantes
    if (data.variants) {
      for (const variant of data.variants) {
        if (
          variant.price !== undefined &&
          variant.price !== null &&
          variant.price <= 0
        ) {
          throw new Error(
            `El precio de la variante "${variant.name}" debe ser mayor a 0`
          );
        }
      }
    }

    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        launchPrice: data.launchPrice,
        currency: data.currency || "ARS",
        images: data.images || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        variants: data.variants
          ? {
              create: data.variants.map((variant) => ({
                name: variant.name,
                size: variant.size,
                price: variant.price,
                stock: variant.stock,
                sku: variant.sku,
                isActive:
                  variant.isActive !== undefined ? variant.isActive : true,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductDto) {
    // Validaciones de precio
    if (data.basePrice !== undefined && data.basePrice <= 0) {
      throw new Error("El precio base debe ser mayor a 0");
    }
    if (data.launchPrice !== undefined) {
      // Si se envía null, se permite (para remover el precio de lanzamiento)
      if (data.launchPrice !== null) {
        if (data.launchPrice <= 0) {
          throw new Error("El precio de lanzamiento debe ser mayor a 0");
        }
        const product = await prisma.product.findUnique({ where: { id } });
        const effectiveBasePrice =
          data.basePrice ?? Number(product?.basePrice ?? 0);
        if (data.launchPrice > effectiveBasePrice) {
          throw new Error(
            "El precio de lanzamiento debe ser menor o igual al precio base"
          );
        }
      }
    }

    // Construir objeto de datos solo con campos definidos
    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.launchPrice !== undefined)
      updateData.launchPrice = data.launchPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: {
          orderBy: { name: "asc" },
        },
      },
    });
  }

  /**
   * Delete product (soft delete by setting isActive to false)
   */
  async delete(id: string) {
    // Soft delete: set isActive to false
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Hard delete product (use with caution)
   */
  async hardDelete(id: string) {
    // This will cascade delete variants
    return prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Create product variant
   */
  async createVariant(productId: string, data: CreateProductVariantDto) {
    // Validación de precio
    if (data.price !== undefined && data.price !== null && data.price <= 0) {
      throw new Error("El precio de la variante debe ser mayor a 0");
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    return prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        size: data.size,
        price: data.price,
        stock: data.stock,
        sku: data.sku,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Update product variant
   */
  async updateVariant(variantId: string, data: UpdateProductVariantDto) {
    // Validación de precio
    if (data.price !== undefined && data.price !== null && data.price <= 0) {
      throw new Error("El precio de la variante debe ser mayor a 0");
    }

    return prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: data.name,
        size: data.size,
        price: data.price,
        stock: data.stock,
        sku: data.sku,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete product variant
   */
  async deleteVariant(variantId: string) {
    // Soft delete: set isActive to false
    return prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  /**
   * Hard delete product variant
   */
  async hardDeleteVariant(variantId: string) {
    return prisma.productVariant.delete({
      where: { id: variantId },
    });
  }
}
