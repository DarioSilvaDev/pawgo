"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/product";
import { getPriceDisplay, formatPrice, PaymentType } from "@/lib/pricing";
import { MercadoPagoTrustBadge } from "@/components/checkout/MercadoPagoTrustBadge";

// Estructura: Map<productId, Map<variantId, quantity>>
type SelectedProducts = Map<string, Map<string, number>>;

type DescriptionBlock =
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] };

interface ProductSelectionProps {
  products: Product[];
  paymentType: PaymentType;
  onPaymentTypeChange: (paymentType: PaymentType) => void;
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
  paymentType,
  onPaymentTypeChange,
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

  const parseDescriptionBlocks = (text: string): DescriptionBlock[] => {
    const blocks: DescriptionBlock[] = [];
    const lines = text.split("\n");
    const bulletRegex = /^(\*|-|•|✓|✔)\s*/;
    let currentList: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push({ type: "list", items: currentList });
        currentList = [];
      }
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trim();

      if (!line) {
        flushList();
        return;
      }

      if (bulletRegex.test(line)) {
        currentList.push(line.replace(bulletRegex, "").trim());
        return;
      }

      flushList();
      blocks.push({ type: "paragraph", content: line });
    });

    flushList();
    return blocks;
  };

  const renderInlineText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-text-black">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const renderDescription = (text: string, isExpanded: boolean) => {
    if (!text) return null;

    const blocks = parseDescriptionBlocks(text);
    const firstParagraph = blocks.find(
      (
        block
      ): block is Extract<DescriptionBlock, { type: "paragraph" }> =>
        block.type === "paragraph"
    );
    const firstList = blocks.find(
      (block): block is Extract<DescriptionBlock, { type: "list" }> =>
        block.type === "list"
    );

    if (!isExpanded) {
      return (
        <div className="space-y-2.5">
          {firstParagraph && (
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
              {renderInlineText(firstParagraph.content)}
            </p>
          )}

          {firstList && firstList.items.length > 0 && (
            <ul className="space-y-1.5">
              {firstList.items.slice(0, 3).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-1 text-primary-turquoise font-bold">✓</span>
                  <span>{renderInlineText(item)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {blocks.map((block, blockIndex) => {
          if (block.type === "paragraph") {
            return (
              <p key={blockIndex} className="text-sm text-slate-700 leading-relaxed">
                {renderInlineText(block.content)}
              </p>
            );
          }

          return (
            <ul key={blockIndex} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-1 text-primary-turquoise font-bold">✓</span>
                  <span>{renderInlineText(item)}</span>
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    );
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
        const priceInfo = getPriceDisplay(product, firstVariant, paymentType);
        const launchPrice = priceInfo.cardPrice;
        const discountPercentage =
          launchPrice < priceInfo.officialPrice
            ? Math.round((1 - launchPrice / priceInfo.officialPrice) * 100)
            : 0;
        const hasLaunchPrice = launchPrice < priceInfo.officialPrice;
        const cashBenefitAmount =
          priceInfo.cashPrice < launchPrice ? launchPrice - priceInfo.cashPrice : 0;

        return (
          <div
            key={product.id}
            className="flex flex-col gap-4"
          >
            {/* Main Product Card */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <div className="flex gap-3 md:gap-4">
                {/* Product Image - Smaller on mobile */}
                <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src="/images/ejemplo-removebg-preview.png"
                        alt={product.name}
                        fill
                        className="object-contain p-1"
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
                  <h3 className="text-base md:text-lg font-bold text-text-black leading-snug line-clamp-2">
                    {product.name}
                  </h3>

                  <div className="mt-1.5 mb-2">
                    <p className="text-5xl md:text-[3.25rem] leading-none font-black tracking-tight text-text-black">
                      {formatPrice(launchPrice, product.currency)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-2xl leading-none text-gray-400 line-through">
                        {formatPrice(priceInfo.officialPrice, product.currency)}
                      </span>
                      {discountPercentage > 0 && (
                        <span className="text-[1.7rem] leading-none font-extrabold text-emerald-600">
                          {discountPercentage}% OFF
                        </span>
                      )}
                    </div>
                    {hasLaunchPrice && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                        🚀 Lanzamiento
                      </span>
                    )}
                  </div>

                  {/* Price Section */}
                  <div className="mt-2 mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div className="space-y-2" role="radiogroup" aria-label="Método de pago">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentType === "card"}
                        onClick={() => onPaymentTypeChange("card")}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors min-h-[56px] ${paymentType === "card"
                          ? "border-emerald-300 bg-emerald-100"
                          : "border-gray-200 bg-white hover:bg-gray-100"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-text-black leading-tight">Tarjeta (6 cuotas)</span>
                          <span className="text-lg font-bold text-emerald-700 leading-none">
                            {formatPrice(priceInfo.cardPrice, product.currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-dark-gray">Hasta 6 cuotas sin interés.</p>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentType === "cash"}
                        onClick={() => onPaymentTypeChange("cash")}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors min-h-[56px] ${paymentType === "cash"
                          ? "border-teal-300 bg-teal-100"
                          : "border-gray-200 bg-white hover:bg-gray-100"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold text-text-black leading-tight">Contado / transferencia</span>
                          <span className="text-lg font-bold text-teal-700 leading-none">
                            {formatPrice(priceInfo.cashPrice, product.currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-dark-gray">
                          {cashBenefitAmount > 0
                            ? `Beneficio sobre lanzamiento: ${formatPrice(cashBenefitAmount, product.currency)} menos.`
                            : "Precio especial por unidad."}
                        </p>
                      </button>
                    </div>
                  </div>

                  <MercadoPagoTrustBadge variant="feature" className="mb-3 mt-1" />

                  <div className="relative">
                    {renderDescription(
                      product.description,
                      expandedProducts.has(product.id)
                    )}
                    {product.description && product.description.length > 100 && (
                      <button
                        type="button"
                        onClick={() => toggleDescription(product.id)}
                        className="text-xs font-bold text-primary-turquoise mt-2 hover:underline flex items-center gap-1"
                      >
                        {expandedProducts.has(product.id) ? (
                          <>Ver menos <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></>
                        ) : (
                          <>Ver detalles técnicos <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>
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

                          {/* Low stock label */}
                          {stock !== null && stock > 0 && stock <= 5 && (
                            <span className="text-[9px] font-bold text-orange-500 mt-0.5">
                              🔥 ¡Últimas unidades!
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
