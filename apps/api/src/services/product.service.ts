import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.client.js";
import { StorageService } from "./storage.service.js";
import { StockReservationService } from "./stock-reservation.service.js";
import { envs } from "../config/envs.js";

export interface CreateProductDto {
  name: string;
  description: string;
  basePrice: number;
  launchPrice?: number | null; // Precio de lanzamiento (opcional, null para no establecer)
  cashPrice: number;
  currency?: string;
  images?: string[];
  isActive?: boolean;
  variants?: CreateProductVariantDto[];
}

export interface CreateProductVariantDto {
  name: string;
  size?: string;
  price?: number; // Opcional: si no se especifica, usará basePrice del producto
  cashPrice?: number;
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  basePrice?: number;
  launchPrice?: number | null; // null para remover el precio de lanzamiento
  cashPrice?: number;
  currency?: string;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProductVariantDto {
  name?: string;
  size?: string;
  price?: number;
  cashPrice?: number;
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export class ProductService {
  /**
   * Get all products
   */
  constructor(
    private readonly storageService: StorageService,
    private readonly stockReservationService: StockReservationService
  ) { }

  private extractStorageKey(value: string): string | null {
    if (!value) return null;

    // If it already looks like a key (no scheme), keep it as-is.
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
      return value;
    }

    try {
      const url = new URL(value);
      const path = url.pathname || "";

      // Backblaze public URL format: /file/<bucket>/<key>
      const b2FilePrefix = `/file/${envs.B2_BUCKET}/`;
      if (path.startsWith(b2FilePrefix)) {
        return decodeURIComponent(path.slice(b2FilePrefix.length));
      }

      // S3-style path format: /<bucket>/<key>
      const s3PathPrefix = `/${envs.B2_BUCKET}/`;
      if (path.startsWith(s3PathPrefix)) {
        return decodeURIComponent(path.slice(s3PathPrefix.length));
      }

      return null;
    } catch {
      return null;
    }
  }

  private async resolveImageUrl(value: string): Promise<string> {
    const key = this.extractStorageKey(value);
    if (!key) {
      // If we can't extract a key, return original value (could be a stable public URL)
      return value;
    }
    return this.storageService.getSignedUrl(key);
  }

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
    const products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(products.map(async (product) => {
      return {
        ...product,
        images:
          product.images.length > 0
            ? await Promise.all(product.images.map((value) => this.resolveImageUrl(value)))
            : [],
      };
    }));
  }

  /**
   * Get product by ID
   */
  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!product) return null;

    return {
      ...product,
      images:
        product.images.length > 0
          ? await Promise.all(product.images.map((value) => this.resolveImageUrl(value)))
          : [],
    };
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

    if (data.cashPrice <= 0) {
      throw new Error("El precio contado debe ser mayor a 0");
    }

    const cardReferencePrice = data.launchPrice != null ? data.launchPrice : data.basePrice;
    if (data.cashPrice > cardReferencePrice) {
      throw new Error("El precio contado debe ser menor o igual al precio de tarjeta");
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

        if (
          variant.cashPrice !== undefined &&
          variant.cashPrice !== null &&
          variant.cashPrice <= 0
        ) {
          throw new Error(
            `El precio contado de la variante "${variant.name}" debe ser mayor a 0`
          );
        }

        const variantCardPrice =
          variant.price !== undefined && variant.price !== null
            ? variant.price
            : cardReferencePrice;

        if (
          variant.cashPrice !== undefined &&
          variant.cashPrice !== null &&
          variant.cashPrice > variantCardPrice
        ) {
          throw new Error(
            `El precio contado de la variante "${variant.name}" debe ser menor o igual al precio de tarjeta`
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
        cashPrice: data.cashPrice,
        currency: data.currency || "ARS",
        images: (data.images || []).map((value) => this.extractStorageKey(value) ?? value),
        isActive: data.isActive !== undefined ? data.isActive : true,
        variants: data.variants
          ? {
            create: data.variants.map((variant) => ({
              name: variant.name,
              size: variant.size,
              price: variant.price,
              cashPrice: variant.cashPrice,
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
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    const effectiveBasePrice = data.basePrice ?? Number(product.basePrice);
    const effectiveLaunchPrice =
      data.launchPrice !== undefined
        ? data.launchPrice
        : product.launchPrice != null
          ? Number(product.launchPrice)
          : null;

    if (effectiveLaunchPrice != null && effectiveLaunchPrice > effectiveBasePrice) {
      throw new Error("El precio de lanzamiento debe ser menor o igual al precio base");
    }

    const effectiveCardPrice = effectiveLaunchPrice ?? effectiveBasePrice;
    const effectiveCashPrice = data.cashPrice ?? Number(product.cashPrice);

    if (effectiveCashPrice <= 0) {
      throw new Error("El precio contado debe ser mayor a 0");
    }

    if (effectiveCashPrice > effectiveCardPrice) {
      throw new Error("El precio contado debe ser menor o igual al precio de tarjeta");
    }

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
        if (data.launchPrice > effectiveBasePrice) {
          throw new Error(
            "El precio de lanzamiento debe ser menor o igual al precio base"
          );
        }
      }
    }

    if (data.cashPrice !== undefined && data.cashPrice <= 0) {
      throw new Error("El precio contado debe ser mayor a 0");
    }

    // Construir objeto de datos solo con campos definidos
    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.launchPrice !== undefined)
      updateData.launchPrice = data.launchPrice;
    if (data.cashPrice !== undefined) updateData.cashPrice = data.cashPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.images !== undefined) {
      updateData.images = data.images.map((value) => this.extractStorageKey(value) ?? value);
    }
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

    if (data.cashPrice !== undefined && data.cashPrice !== null && data.cashPrice <= 0) {
      throw new Error("El precio contado de la variante debe ser mayor a 0");
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    const productCardPrice =
      product.launchPrice != null ? Number(product.launchPrice) : Number(product.basePrice);
    const variantCardPrice =
      data.price !== undefined && data.price !== null ? data.price : productCardPrice;

    if (
      data.cashPrice !== undefined &&
      data.cashPrice !== null &&
      data.cashPrice > variantCardPrice
    ) {
      throw new Error("El precio contado de la variante debe ser menor o igual al precio de tarjeta");
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: data.name,
        size: data.size,
        price: data.price,
        cashPrice: data.cashPrice,
        stock: data.stock,
        sku: data.sku,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    // If initial stock is > 0, trigger replenishment check
    if (variant.stock && variant.stock > 0) {
      this.stockReservationService.processReplenishment(variant.id).catch(err => {
        console.error(`[ProductService] Error processing replenishment for variant ${variant.id}:`, err);
      });
    }

    return variant;
  }

  /**
   * Update product variant
   */
  async updateVariant(variantId: string, data: UpdateProductVariantDto) {
    // Validación de precio
    if (data.price !== undefined && data.price !== null && data.price <= 0) {
      throw new Error("El precio de la variante debe ser mayor a 0");
    }

    if (data.cashPrice !== undefined && data.cashPrice !== null && data.cashPrice <= 0) {
      throw new Error("El precio contado de la variante debe ser mayor a 0");
    }

    // Get current stock to check if it's a replenishment (from 0 to > 0)
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        stock: true,
        price: true,
        cashPrice: true,
        product: {
          select: {
            basePrice: true,
            launchPrice: true,
          },
        },
      },
    });
    console.log("🚀 ~ ProductService ~ updateVariant ~ currentVariant:", currentVariant)

    if (!currentVariant) {
      throw new Error("Variante no encontrada");
    }

    const productCardPrice =
      currentVariant.product.launchPrice != null
        ? Number(currentVariant.product.launchPrice)
        : Number(currentVariant.product.basePrice);
    const nextCardPrice =
      data.price !== undefined
        ? data.price ?? productCardPrice
        : currentVariant.price != null
          ? Number(currentVariant.price)
          : productCardPrice;
    const nextCashPrice =
      data.cashPrice !== undefined
        ? data.cashPrice
        : currentVariant.cashPrice != null
          ? Number(currentVariant.cashPrice)
          : null;

    if (nextCashPrice != null && nextCashPrice > nextCardPrice) {
      throw new Error("El precio contado de la variante debe ser menor o igual al precio de tarjeta");
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: data.name,
        size: data.size,
        price: data.price,
        cashPrice: data.cashPrice,
        stock: data.stock,
        sku: data.sku,
        isActive: data.isActive,
      },
    });
    console.log("🚀 ~ ProductService ~ updateVariant ~ updatedVariant:", updatedVariant)

    // Trigger replenishment if stock went from 0 (or null) to > 0
    const oldStock = currentVariant?.stock ?? 0;
    const newStock = updatedVariant.stock ?? 0;

    if (oldStock === 0 && newStock > 0) {
      this.stockReservationService.processReplenishment(variantId).catch(err => {
        console.error(`[ProductService] Error processing replenishment for variant ${variantId}:`, err);
      });
    }

    return updatedVariant;
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
