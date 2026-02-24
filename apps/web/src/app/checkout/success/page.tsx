"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOrder } from "@/lib/order";
import Link from "next/link";

const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 4000;

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const fetchOrder = useCallback(async (): Promise<string | null> => {
    if (!orderId) return null;
    const orderData = await getOrder(orderId);
    setOrder(orderData);
    return orderData?.status ?? null;
  }, [orderId]);

  // Initial load + polling loop
  useEffect(() => {
    // Clear payment session flags
    sessionStorage.removeItem("paymentInProgress");
    sessionStorage.removeItem("paymentOrderId");

    if (!orderId) {
      setError("No se proporcionó un ID de orden");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const poll = async () => {
      try {
        const status = await fetchOrder();

        if (cancelled) return;

        attempt++;
        setPollAttempt(attempt);

        if (status === "paid" || status === "cancelled") {
          // Final state reached — stop polling
          setIsPolling(false);
          setLoading(false);
          return;
        }

        // Still pending — keep polling if under limit
        if (attempt < MAX_POLL_ATTEMPTS) {
          setIsPolling(true);
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          // Exhausted retries — show whatever state we have
          setIsPolling(false);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching order:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar la información de la orden"
        );
        setLoading(false);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [orderId, fetchOrder]);

  // ── Loading / polling state ──────────────────────────────────────────────
  if (loading || isPolling) {
    const isPendingStatus = order?.status === "pending" || order?.status == null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-500 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-black mb-2">
            {isPendingStatus && order !== null
              ? "Verificando tu pago..."
              : "Cargando información del pedido..."}
          </h1>
          {isPendingStatus && order !== null && (
            <p className="text-text-dark-gray text-sm mb-4">
              Estamos esperando la confirmación de MercadoPago. Esto puede
              demorar unos segundos.
            </p>
          )}
          <div className="flex justify-center gap-1 mt-4">
            {Array.from({ length: MAX_POLL_ATTEMPTS }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full transition-all ${i < pollAttempt
                    ? "bg-primary-turquoise"
                    : "bg-gray-200"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
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
          <h2 className="text-2xl font-bold text-text-black mb-2">Error</h2>
          <p className="text-text-dark-gray mb-6">{error}</p>
          <Link href="/" className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending — polling exhausted ──────────────────────────────────────────
  if (order?.status === "pending") {
    return (
      <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-black mb-2">
              Pago en procesamiento
            </h1>
            <p className="text-text-dark-gray mb-6">
              Tu pago está siendo procesado por MercadoPago. Recibirás un email
              de confirmación cuando sea aprobado.
            </p>
            {orderId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-text-dark-gray mb-1">
                  Número de orden:
                </p>
                <p className="text-lg font-semibold text-text-black">
                  {orderId}
                </p>
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-yellow-800">
                <strong>¿Ya realizaste el pago?</strong> Algunos medios de pago
                (como transferencias bancarias) pueden demorar hasta 24 horas en
                confirmarse.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-secondary">
                Volver al inicio
              </Link>
              <button
                onClick={() => router.push(`/checkout/pending?orderId=${orderId}`)}
                className="btn-primary"
              >
                Ver estado del pago
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Cancelled / rejected ─────────────────────────────────────────────────
  if (order?.status === "cancelled") {
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
          <h1 className="text-2xl font-bold text-text-black mb-2">
            Pago no completado
          </h1>
          <p className="text-text-dark-gray mb-6">
            Tu pago fue rechazado o cancelado. Por favor, intentá nuevamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="btn-secondary">
              Volver al inicio
            </Link>
            <Link href="/checkout" className="btn-primary">
              Intentar nuevamente
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Paid / success ───────────────────────────────────────────────────────
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
              Tu pago ha sido procesado correctamente. Recibirás un email de
              confirmación pronto.
            </p>

            {order && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h2 className="text-lg font-semibold text-text-black mb-4">
                  Detalles de tu pedido
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-dark-gray">Número de orden:</span>
                    <span className="font-semibold text-text-black">
                      {order.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-dark-gray">Estado:</span>
                    <span className="font-semibold text-green-600">Pagado</span>
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
                    <span className="text-lg font-semibold text-text-black">
                      Total:
                    </span>
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
