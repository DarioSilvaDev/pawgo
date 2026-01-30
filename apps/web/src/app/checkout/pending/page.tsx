"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOrder, getPaymentStatus } from "@/lib/order";
import Link from "next/link";

function CheckoutPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadOrderData = useCallback(async () => {
    try {
      const orderData = await getOrder(orderId!);
      setOrder(orderData);

      // Si hay un pago asociado, verificar su estado
      if (orderData.payments && orderData.payments.length > 0) {
        const payment = orderData.payments[0];
        if (payment.id) {
          try {
            const status = await getPaymentStatus(payment.id);
            setPaymentStatus(status);
          } catch (err) {
            console.error("Error fetching payment status:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    } else {
      setLoading(false);
    }
  }, [orderId, loadOrderData]);

  const handleCheckStatus = async () => {
    if (!orderId) return;

    setChecking(true);
    try {
      await loadOrderData();
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setChecking(false);
    }
  };

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

  // Si el pago ya fue aprobado, redirigir a success
  if (paymentStatus?.status === "approved" || order?.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="text-center">
          <p className="text-text-dark-gray mb-4">
            Tu pago ha sido aprobado. Redirigiendo...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise mx-auto"></div>
          <script
            dangerouslySetInnerHTML={{
              __html: `setTimeout(() => { window.location.href = '/checkout/success?orderId=${orderId}'; }, 2000);`,
            }}
          />
        </div>
      </div>
    );
  }

  // Si el pago fue rechazado, redirigir a failure
  if (paymentStatus?.status === "rejected" || paymentStatus?.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="text-center">
          <p className="text-text-dark-gray mb-4">
            Tu pago fue rechazado. Redirigiendo...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise mx-auto"></div>
          <script
            dangerouslySetInnerHTML={{
              __html: `setTimeout(() => { window.location.href = '/checkout/failure?orderId=${orderId}'; }, 2000);`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600 animate-spin"
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
              Pago Pendiente
            </h1>
            <p className="text-text-dark-gray mb-6">
              Tu pago está siendo procesado. Te notificaremos por email una vez que sea confirmado.
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

            {paymentStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Estado del pago:
                </h3>
                <p className="text-sm text-blue-800 capitalize">
                  {paymentStatus.status === "pending"
                    ? "Pendiente de confirmación"
                    : paymentStatus.status === "in_process"
                    ? "En proceso"
                    : paymentStatus.status}
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Algunos métodos de pago pueden tardar hasta 24 horas en
                confirmarse. Recibirás un email cuando el pago sea aprobado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-secondary">
                Volver al inicio
              </Link>
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  "Verificar estado"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPendingPage() {
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
      <CheckoutPendingContent />
    </Suspense>
  );
}
