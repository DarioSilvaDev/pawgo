"use client";

import { useState } from "react";
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
  onBackInStockRequest?: (product: Product) => void;
}

export function ProductSelection({
  products,
  selectedProducts,
  onSelectProduct,
  onBackInStockRequest,
}: ProductSelectionProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleDescription = (productId: string) => {
    setExpandedProducts((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const renderDescription = (text: string) => {
    if (!text) return null;

    return text.split('\n').map((line, i) => {
      // Bold detection: **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i} className="block min-h-[0.5rem]">
          {parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={index} className="text-text-black font-bold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            // Highlight checkmarks or bullets
            if (part.trim().startsWith('✓') || part.trim().startsWith('✔')) {
              return (
                <span key={index} className="text-primary-turquoise font-bold">
                  {part}
                </span>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

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
    <div className="space-y-6">
      {activeProducts.map((product) => {
        const activeVariants =
          product.variants?.filter((v) => v.isActive) || [];
        const selectedVariants =
          selectedProducts.get(product.id) || new Map<string, number>();

        // Get primary display price (using first active variant if none selected)
        const firstVariant = activeVariants[0];
        const priceInfo = getPriceDisplay(product, firstVariant);

        return (
          <div
            key={product.id}
            className="flex flex-col gap-4"
          >
            {/* Main Product Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex gap-4">
                {/* Product Image - Smaller on mobile */}
                <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                  <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src="/images/ejemplo-removebg-preview.png"
                        alt={product.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 96px, 128px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        Sin imagen
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Info & Unified Price */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-text-black mb-1 truncate">
                    {product.name}
                  </h3>

                  {/* Price Section */}
                  <div className="flex flex-col mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl font-bold text-text-black">
                        {formatPrice(priceInfo.effectivePrice, product.currency)}
                      </span>
                      {priceInfo.originalPrice != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(priceInfo.originalPrice, product.currency)}
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            {Math.round((1 - priceInfo.effectivePrice / priceInfo.originalPrice) * 100)}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                    {priceInfo.showLaunchBadge && (
                      <span className="inline-flex mt-1 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded w-fit">
                        🚀 Lanzamiento
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className={`text-xs md:text-sm text-text-dark-gray transition-all leading-relaxed ${expandedProducts.has(product.id) ? "" : "line-clamp-3 md:line-clamp-4"
                      }`}>
                      {renderDescription(product.description)}
                    </div>
                    {product.description && product.description.length > 100 && (
                      <button
                        type="button"
                        onClick={() => toggleDescription(product.id)}
                        className="text-xs font-bold text-primary-turquoise mt-2 hover:underline flex items-center gap-1"
                      >
                        {expandedProducts.has(product.id) ? (
                          <>Ver menos <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></>
                        ) : (
                          <>Ver más detalles <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Variants Selection Section */}
              {activeVariants.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Selecciona tu talle / color:
                  </span>

                  {/* Compact Grid/Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {activeVariants.map((variant) => {
                      const qty = selectedVariants.get(variant.id) || 0;
                      const isSelected = qty > 0;
                      const stock = variant.stock ?? null;
                      const isOutOfStock = stock !== null && stock <= 0;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) {
                              if (onBackInStockRequest) onBackInStockRequest(product);
                              return;
                            }
                            onSelectProduct(
                              product.id,
                              variant.id,
                              isSelected ? 0 : 1
                            );
                          }}
                          className={`
                            relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                            ${isSelected
                              ? "border-primary-turquoise bg-primary-turquoise/5"
                              : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                            }
                            ${isOutOfStock ? "border-amber-200 bg-amber-50/30 cursor-pointer" : "cursor-pointer"}
                          `}
                        >
                          <span className={`text-sm font-semibold ${isSelected ? "text-primary-turquoise" : (isOutOfStock ? "text-amber-700" : "text-text-black")}`}>
                            {variant.name}
                          </span>
                          {variant.size && (
                            <span className="text-[10px] text-text-dark-gray">{variant.size}</span>
                          )}

                          {/* Out of stock indicator */}
                          {isOutOfStock && (
                            <span className="text-[9px] font-bold text-amber-600 mt-0.5">
                              Avisame! 🔔
                            </span>
                          )}

                          {/* Stock indicator dots */}
                          {stock !== null && stock > 0 && stock <= 5 && (
                            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                          )}

                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-primary-turquoise text-white rounded-full p-0.5 shadow-sm">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Variants Controls - Only shows for what's picked */}
            {selectedVariants.size > 0 && (
              <div className="space-y-2">
                {[...selectedVariants.entries()].map(([vId, qty]) => {
                  const v = activeVariants.find(av => av.id === vId);
                  if (!v) return null;
                  const stock = v.stock ?? 999;

                  return (
                    <div key={vId} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-primary-turquoise/20 shadow-sm animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary-turquoise">Seleccionado:</span>
                        <span className="text-sm font-medium text-text-black">{v.name} {v.size ? `(${v.size})` : ""}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-100 rounded-full p-1">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product.id, v.id, Math.max(0, qty - 1))}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:text-primary-turquoise shadow-sm transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{qty}</span>
                          <button
                            type="button"
                            disabled={qty >= stock}
                            onClick={() => onSelectProduct(product.id, v.id, qty + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:text-primary-turquoise shadow-sm transition-colors disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
