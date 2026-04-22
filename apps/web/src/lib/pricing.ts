import { Product, ProductVariant } from "./product";

export type PaymentType = "card" | "cash";

export interface PriceDisplayInfo {
  officialPrice: number;
  cardPrice: number;
  cashPrice: number;
  selectedPrice: number;
  paymentType: PaymentType;
}

export function getCardPrice(
  product: Pick<Product, "basePrice" | "launchPrice">,
  variant?: Pick<ProductVariant, "price"> | null
): number {
  if (product.launchPrice != null && product.launchPrice > 0) {
    return product.launchPrice;
  }

  if (variant?.price != null && variant.price > 0) {
    return variant.price;
  }

  return product.basePrice;
}

export function getCashPrice(
  product: Pick<Product, "cashPrice">,
  variant?: Pick<ProductVariant, "cashPrice"> | null
): number {
  if (variant?.cashPrice != null && variant.cashPrice > 0) {
    return variant.cashPrice;
  }

  return product.cashPrice;
}

export function getEffectivePrice(
  product: Pick<Product, "basePrice" | "launchPrice" | "cashPrice">,
  variant?: Pick<ProductVariant, "price" | "cashPrice"> | null,
  paymentType: PaymentType = "card"
): number {
  return paymentType === "cash"
    ? getCashPrice(product, variant)
    : getCardPrice(product, variant);
}

export function getPriceDisplay(
  product: Pick<Product, "basePrice" | "launchPrice" | "cashPrice">,
  variant: Pick<ProductVariant, "price" | "cashPrice"> | null = null,
  paymentType: PaymentType = "card"
): PriceDisplayInfo {
  const cardPrice = getCardPrice(product, variant);
  const cashPrice = getCashPrice(product, variant);

  return {
    officialPrice: product.basePrice,
    cardPrice,
    cashPrice,
    selectedPrice: paymentType === "cash" ? cashPrice : cardPrice,
    paymentType,
  };
}

export function formatPrice(price: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}
