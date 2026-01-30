import { Product, ProductVariant } from "./product";

/**
 * Resultado del cálculo de precio con información para UI
 */
export interface PriceDisplayInfo {
  /** Precio efectivo a usar para cálculos */
  effectivePrice: number;
  /** Precio original (tachado) si aplica */
  originalPrice?: number;
  /** Mostrar badge de lanzamiento */
  showLaunchBadge: boolean;
  /** Tipo de precio: 'launch' | 'variant' | 'base' */
  priceType: "launch" | "variant" | "base";
}

/**
 * Calcula el precio efectivo según las reglas de negocio:
 * 1. Si el producto tiene launchPrice → precio efectivo es launchPrice
 * 2. Si no hay launchPrice pero la variante tiene price → precio efectivo es variant.price
 * 3. Si ninguno → precio efectivo es basePrice
 */
export function getEffectivePrice(
  product: Pick<Product, "basePrice" | "launchPrice">,
  variant?: Pick<ProductVariant, "price"> | null
): number {
  // Regla 1: Si hay launchPrice, usar launchPrice
  if (product.launchPrice != null && product.launchPrice > 0) {
    return product.launchPrice;
  }

  // Regla 2: Si hay variant.price, usar variant.price
  if (variant?.price != null && variant.price > 0) {
    return variant.price;
  }

  // Regla 3: Usar basePrice
  return product.basePrice;
}

/**
 * Obtiene información completa para mostrar el precio en UI:
 * - Si hay launchPrice → basePrice tachado + launchPrice resaltado + badge "Lanzamiento"
 * - Si no hay launchPrice pero hay variant.price → solo price (sin tachado, sin badge)
 * - Si ninguno → basePrice normal
 */
export function getPriceDisplay(
  product: Pick<Product, "basePrice" | "launchPrice">,
  variant?: Pick<ProductVariant, "price"> | null
): PriceDisplayInfo {
  // Caso 1: Hay launchPrice
  if (product.launchPrice != null && product.launchPrice > 0) {
    return {
      effectivePrice: product.launchPrice,
      originalPrice: product.basePrice,
      showLaunchBadge: true,
      priceType: "launch",
    };
  }

  // Caso 2: Hay variant.price (pero no launchPrice)
  if (variant?.price != null && variant.price > 0) {
    return {
      effectivePrice: variant.price,
      originalPrice: undefined, // Sin tachado
      showLaunchBadge: false, // Sin badge
      priceType: "variant",
    };
  }

  // Caso 3: Solo basePrice
  return {
    effectivePrice: product.basePrice,
    originalPrice: undefined,
    showLaunchBadge: false,
    priceType: "base",
  };
}

/**
 * Formatea un precio para mostrar en ARS
 */
export function formatPrice(price: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}
