import { Prisma } from "@prisma/client";

export type Decimal = Prisma.Decimal;
export type PaymentType = "card" | "cash";

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
 * Calcula el precio efectivo según método de pago.
 * card: launchPrice > variant.price > basePrice
 * cash: variant.cashPrice > product.cashPrice
 */
export function getEffectivePrice(
  product: {
    basePrice: Decimal | number;
    launchPrice?: Decimal | number | null;
    cashPrice?: Decimal | number | null;
  },
  variant: { price?: Decimal | number | null; cashPrice?: Decimal | number | null } | null = null,
  paymentType: PaymentType = "card"
): Prisma.Decimal {
  if (paymentType === "cash") {
    if (variant?.cashPrice != null) {
      const variantCashPrice = prismaDecimal(variant.cashPrice);
      if (variantCashPrice.greaterThan(0)) {
        return variantCashPrice;
      }
    }

    if (product.cashPrice != null) {
      const productCashPrice = prismaDecimal(product.cashPrice);
      if (productCashPrice.greaterThan(0)) {
        return productCashPrice;
      }
    }

    throw new Error("No hay precio contado configurado para este producto");
  }

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
