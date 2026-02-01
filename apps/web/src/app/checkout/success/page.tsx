"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOrder } from "@/lib/order";
import Link from "next/link";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear payment in progress flag when arriving at success page
    sessionStorage.removeItem("paymentInProgress");
    sessionStorage.removeItem("paymentOrderId");

    if (orderId) {
      getOrder(orderId)
        .then((orderData) => {
          setOrder(orderData);
        })
        .catch((err) => {
          console.error("Error fetching order:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la información de la orden"
          );
        })
        .finally(() => setLoading(false));
    } else {
      setError("No se proporcionó un ID de orden");
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
          <p className="text-text-dark-gray">Cargando información del pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-black mb-2">
            Error
          </h2>
          <p className="text-text-dark-gray mb-6">{error}</p>
          <Link href="/" className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h1 className="text-2xl md:text-3xl font-bold text-text-black mb-2">
              ¡Pago Exitoso!
            </h1>
            <p className="text-text-dark-gray mb-6">
              Tu pago ha sido procesado correctamente. Recibirás un email de confirmación pronto.
            </p>

            {order && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h2 className="text-lg font-semibold text-text-black mb-4">
                  Detalles de tu pedido
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-dark-gray">Número de orden:</span>
                    <span className="font-semibold text-text-black">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-dark-gray">Estado:</span>
                    <span className="font-semibold text-primary-turquoise capitalize">
                      {order.status === "paid" ? "Pagado" : order.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-dark-gray">Subtotal:</span>
                    <span className="font-medium">
                      ${order.subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span className="font-medium">
                        -${order.discount.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  {order.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-dark-gray">Envío:</span>
                      <span className="font-medium">
                        ${order.shippingCost.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-lg font-semibold text-text-black">Total:</span>
                    <span className="text-xl font-bold text-primary-turquoise">
                      ${order.total.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-secondary">
                Volver al inicio
              </Link>
              {order && (
                <button
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="btn-primary"
                >
                  Ver detalles del pedido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
            <p className="text-text-dark-gray">Cargando...</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
