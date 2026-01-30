"use client";

import Image from "next/image";
import { Product, ProductVariant } from "@/lib/product";
import { getPriceDisplay, formatPrice } from "@/lib/pricing";

// Estructura: Map<productId, Map<variantId, quantity>>
type SelectedProducts = Map<string, Map<string, number>>;

interface ProductSelectionProps {
  products: Product[];
  selectedProducts: SelectedProducts;
  onSelectProduct: (
    productId: string,
    variantId: string,
    quantity: number
  ) => void;
}

export function ProductSelection({
  products,
  selectedProducts,
  onSelectProduct,
}: ProductSelectionProps) {
  const activeProducts = products.filter((p) => p.isActive);

  if (activeProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-dark-gray text-lg">
          No hay productos disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeProducts.map((product) => {
        const activeVariants =
          product.variants?.filter((v) => v.isActive) || [];
        const selectedVariants =
          selectedProducts.get(product.id) || new Map<string, number>();

        return (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product Image */}
              <div className="w-full md:w-1/3">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src="/images/ejemplo-removebg-preview.png"
                      // src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-text-black mb-2">
                  {product.name}
                </h3>
                <p className="text-text-dark-gray mb-4 line-clamp-2">
                  {product.description}
                </p>

                {/* Variants Selection */}
                {activeVariants.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {activeVariants.map((variant) => {
                        const quantity = selectedVariants.get(variant.id) || 0;
                        const isSelected = quantity > 0;
                        const stock = variant.stock ?? null;
                        const isOutOfStock = stock !== null && stock <= 0;

                        return (
                          <div
                            key={variant.id}
                            className={`border-2 rounded-lg p-4 transition-all ${
                              isSelected
                                ? "border-primary-turquoise bg-primary-turquoise/5"
                                : "border-gray-200 hover:border-gray-300"
                            } ${
                              isOutOfStock
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div
                                className="flex-1"
                                onClick={() => {
                                  if (!isOutOfStock) {
                                    onSelectProduct(
                                      product.id,
                                      variant.id,
                                      isSelected ? 0 : 1
                                    );
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-text-black">
                                    {variant.name}
                                  </span>
                                  {variant.size && (
                                    <span className="text-sm text-text-dark-gray">
                                      ({variant.size})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  {(() => {
                                    const priceInfo = getPriceDisplay(product, variant);
                                    return (
                                      <>
                                        {/* Si hay precio original (tachado) */}
                                        {priceInfo.originalPrice != null && (
                                          <span className="text-sm text-gray-400 line-through">
                                            {formatPrice(priceInfo.originalPrice, product.currency)}
                                          </span>
                                        )}
                                        {/* Precio efectivo */}
                                        <span className="text-lg font-bold text-primary-turquoise">
                                          {formatPrice(priceInfo.effectivePrice, product.currency)}
                                        </span>
                                        {/* Badge de lanzamiento */}
                                        {priceInfo.showLaunchBadge && (
                                          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">
                                            🚀 Lanzamiento
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {stock !== null && (
                                    <span
                                      className={`text-sm ${
                                        stock > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {stock > 0
                                        ? `${stock} disponibles`
                                        : "Sin stock"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quantity Selector - Solo visible si está seleccionado */}
                              {isSelected && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (quantity > 1) {
                                        onSelectProduct(
                                          product.id,
                                          variant.id,
                                          quantity - 1
                                        );
                                      } else {
                                        onSelectProduct(
                                          product.id,
                                          variant.id,
                                          0
                                        );
                                      }
                                    }}
                                    className="w-8 h-8 md:w-9 md:h-9 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-primary-turquoise transition-colors"
                                    aria-label="Disminuir cantidad"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 12H4"
                                      />
                                    </svg>
                                  </button>
                                  <span className="w-10 md:w-12 text-center font-semibold text-base md:text-lg min-w-[2.5rem]">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const maxQty =
                                        stock !== null ? stock : 999;
                                      if (quantity < maxQty) {
                                        onSelectProduct(
                                          product.id,
                                          variant.id,
                                          quantity + 1
                                        );
                                      }
                                    }}
                                    className="w-8 h-8 md:w-9 md:h-9 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-primary-turquoise transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Aumentar cantidad"
                                    disabled={
                                      stock !== null && quantity >= stock
                                    }
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Indicador visual de selección */}
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-primary-turquoise flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                <span className="text-sm text-primary-turquoise font-medium">
                                  {quantity}{" "}
                                  {quantity === 1 ? "unidad" : "unidades"} en el
                                  carrito
                                </span>
                                {stock !== null && quantity > 0 && (
                                  <span className="text-xs text-text-dark-gray ml-auto">
                                    Stock: {stock - quantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-text-dark-gray">
                    No hay variantes disponibles para este producto.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
