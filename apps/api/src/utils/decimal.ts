import { Prisma } from "@prisma/client";

export type Decimal = Prisma.Decimal;

export function prismaDecimal(
  value: Prisma.Decimal.Value | null | undefined,
  fallback: Prisma.Decimal.Value = 0
): Prisma.Decimal {
  return new Prisma.Decimal(value ?? fallback);
}

export function prismaNumber(
  value: Prisma.Decimal.Value | null | undefined
): number {
  if (value === null || value === undefined) {
    console.warn("[prismaNumber] Received null/undefined value, returning 0");
    return 0;
  }
  
  try {
    // Si ya es un número, retornarlo directamente
    if (typeof value === "number") {
      return isNaN(value) ? 0 : value;
    }
    
    // Si es un Decimal de Prisma, convertirlo
    if (value instanceof Prisma.Decimal) {
      const num = value.toNumber();
      return isNaN(num) ? 0 : num;
    }
    
    // Si es string u otro tipo, crear Decimal y convertir
    const decimal = new Prisma.Decimal(value);
    const num = decimal.toNumber();
    return isNaN(num) ? 0 : num;
  } catch (error) {
    console.error("[prismaNumber] Error converting value:", value, error);
    return 0;
  }
}

/**
 * Backwards-compatible helpers used across older services.
 * Prefer `prismaDecimal` / `prismaNumber` in new code.
 */
export const d = prismaDecimal;
export const n = prismaNumber;

/**
 * Calcula el precio efectivo según las reglas de negocio:
 * 1. Si el producto tiene launchPrice → precio efectivo es launchPrice
 * 2. Si no hay launchPrice pero la variante tiene price → precio efectivo es variant.price
 * 3. Si ninguno → precio efectivo es basePrice
 */
export function getEffectivePrice(
  product: { basePrice: Decimal | number; launchPrice?: Decimal | number | null },
  variant?: { price?: Decimal | number | null } | null
): Prisma.Decimal {
  // Regla 1: Si hay launchPrice, usar launchPrice
  if (product.launchPrice != null) {
    const launchPrice = prismaDecimal(product.launchPrice);
    if (launchPrice.greaterThan(0)) {
      return launchPrice;
    }
  }

  // Regla 2: Si hay variant.price, usar variant.price
  if (variant?.price != null) {
    const variantPrice = prismaDecimal(variant.price);
    if (variantPrice.greaterThan(0)) {
      return variantPrice;
    }
  }

  // Regla 3: Usar basePrice
  return prismaDecimal(product.basePrice);
}
