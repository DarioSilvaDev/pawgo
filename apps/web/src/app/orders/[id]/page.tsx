"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/lib/order";

interface OrderDetailsPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No se proporcionó un ID de orden");
      setLoading(false);
      return;
    }

    getOrder(id)
      .then((orderData) => {
        setOrder(orderData);
      })
      .catch((err) => {
        console.error("Error fetching order:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar la información de la orden",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
          <p className="text-text-dark-gray">
            Cargando información del pedido...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
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
            Pedido no encontrado
          </h2>
          <p className="text-text-dark-gray mb-6">
            {error || "No pudimos encontrar la información de este pedido."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.back()}
              className="btn-secondary w-full"
            >
              Volver
            </button>
            <Link href="/" className="btn-primary w-full text-center">
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-black mb-4">
            Detalle del pedido
          </h1>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-dark-gray">Número de orden:</span>
                <span className="font-semibold text-text-black">
                  {order.id}
                </span>
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
                <span className="text-lg font-semibold text-text-black">
                  Total:
                </span>
                <span className="text-xl font-bold text-primary-turquoise">
                  ${order.total.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-black mb-3">
                Productos
              </h2>
              <div className="space-y-2">
                {order.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm border-b border-gray-100 pb-2"
                  >
                    <span className="text-text-dark-gray">
                      {item.product?.name || item.name}{" "}
                      {item.productVariant?.name
                        ? `- ${item.productVariant.name}`
                        : ""}
                      {item.productVariant?.size
                        ? ` (${item.productVariant.size})`
                        : ""}{" "}
                      (x{item.quantity})
                    </span>
                    <span className="font-medium">
                      ${Number(item.totalPrice).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
            <button
              onClick={() => router.back()}
              className="btn-secondary flex-1 sm:flex-none sm:px-8"
            >
              Volver
            </button>
            <Link
              href="/"
              className="btn-primary flex-1 sm:flex-none sm:px-8 text-center"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
