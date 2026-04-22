"use client";

import { Product, ProductVariant } from "@/lib/product";
import { getPriceDisplay, formatPrice, PaymentType } from "@/lib/pricing";
import { InstallmentsMessage } from "@/components/checkout/InstallmentsMessage";

interface OrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentType: PaymentType;
  currency?: string;
}

export function OrderSummary({
  items,
  subtotal,
  discount,
  shippingCost,
  total,
  paymentType,
  currency = "ARS",
}: OrderSummaryProps) {
  const hasSelectedItems = items.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200 lg:sticky lg:top-4">
      <h3 className="text-lg md:text-xl font-semibold text-text-black mb-4">
        Resumen de Compra
      </h3>

      {/* Items List */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-text-dark-gray text-sm">No hay productos seleccionados</p>
        ) : (
          items.map((item, index) => {
            const priceInfo = getPriceDisplay(item.product, item.variant, paymentType);
            const itemTotal = priceInfo.selectedPrice * item.quantity;

            return (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-text-black text-sm">{item.product.name}</p>
                  <p className="text-xs text-text-dark-gray">
                    {item.variant.name}
                    {item.variant.size && ` (${item.variant.size})`}
                  </p>
                  <p className="text-xs text-text-dark-gray mt-1">
                    Cantidad: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 line-through">
                    {formatPrice(priceInfo.officialPrice * item.quantity, currency)}
                  </p>
                  <p className="font-semibold text-text-black text-sm">
                    {formatPrice(itemTotal, currency)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        {!hasSelectedItems && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-text-dark-gray">Subtotal:</span>
              <span className="text-text-black font-medium">
                ${subtotal.toLocaleString("es-AR")}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Descuento:</span>
                <span className="text-green-600 font-medium">
                  -${discount.toLocaleString("es-AR")}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-text-dark-gray">Envío:</span>
              <span className="text-text-black font-medium">
                {shippingCost > 0
                  ? `$${shippingCost.toLocaleString("es-AR")}`
                  : "Gratis"}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span className="text-text-black">Total:</span>
          <span className="text-primary-turquoise">
            ${total.toLocaleString("es-AR")}
          </span>
        </div>

        <p className="text-xs text-text-dark-gray">
          Método seleccionado: {paymentType === "card" ? "Tarjeta" : "Contado / transferencia"}
        </p>

        {paymentType === "card" ? (
          <InstallmentsMessage
            totalAmount={total}
            currency={currency}
            variant={hasSelectedItems ? "inline" : "card"}
            className="mt-3"
          />
        ) : (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
            <p className="text-xs font-medium text-teal-800">
              Pagando en contado / transferencia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
