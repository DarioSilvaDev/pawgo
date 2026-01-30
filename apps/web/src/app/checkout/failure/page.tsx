"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function CheckoutFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="text-center">
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
            <h1 className="text-2xl md:text-3xl font-bold text-text-black mb-2">
              Pago Rechazado
            </h1>
            <p className="text-text-dark-gray mb-6">
              Tu pago no pudo ser procesado. Por favor, intenta nuevamente o contacta con tu banco
              si el problema persiste.
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                Posibles causas:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Fondos insuficientes en tu cuenta</li>
                <li>Tarjeta rechazada por el banco</li>
                <li>Datos de la tarjeta incorrectos</li>
                <li>Límite de transacciones excedido</li>
              </ul>
            </div>

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
      </div>
    </div>
  );
}

export default function CheckoutFailurePage() {
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
      <CheckoutFailureContent />
    </Suspense>
  );
}
