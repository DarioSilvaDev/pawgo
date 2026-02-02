"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getOrderDetails, type Order } from "@/lib/order";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderDetailsPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { showToast, ToastView } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderId = params.id as string;

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await getOrderDetails(orderId);
      setOrder(data);
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar la orden",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    loadOrder();
  }, [user, isAdmin, router, loadOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Orden no encontrada</p>
              <Link
                href="/dashboard/orders"
                className="mt-4 inline-block text-primary-turquoise hover:text-primary-turquoise/80"
              >
                Volver a órdenes
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/dashboard/orders"
              className="text-primary-turquoise hover:text-primary-turquoise/80 mb-4 inline-block"
            >
              ← Volver a órdenes
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Detalles de la Orden
            </h1>
            <p className="mt-2 text-sm text-gray-600">ID: {order.id}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Estado de la Orden
                </h2>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      STATUS_COLORS[order.status] ||
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status === "pending"
                      ? "Pendiente"
                      : order.status === "paid"
                      ? "Pagado"
                      : order.status === "shipped"
                      ? "Enviado"
                      : order.status === "delivered"
                      ? "Entregado"
                      : order.status === "cancelled"
                      ? "Cancelado"
                      : order.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Creada: {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Productos
                </h2>
                <div className="space-y-4">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.product?.name || item.name || "Producto"}
                            {item.productVariant?.name && (
                              <span className="text-gray-500">
                                {" "}
                                - {item.productVariant.name}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            Cantidad: {item.quantity}
                          </p>
                          {item.productVariant?.size && (
                            <p className="text-sm text-gray-500">
                              Talla: {item.productVariant.size}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(Number(item.unitPrice))} c/u
                          </p>
                          <p className="text-sm text-gray-500">
                            Total: {formatCurrency(Number(item.totalPrice))}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No hay productos en esta orden</p>
                  )}
                </div>
              </div>

              {/* Payments */}
              {order.payments && order.payments.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Pagos
                  </h2>
                  <div className="space-y-4">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.paymentMethod || "MercadoPago"}
                            </p>
                            <p className="text-sm text-gray-500">
                              ID: {payment.id.slice(0, 8)}...
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              PAYMENT_STATUS_COLORS[payment.status] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payment.status === "pending"
                              ? "Pendiente"
                              : payment.status === "approved"
                              ? "Aprobado"
                              : payment.status === "rejected"
                              ? "Rechazado"
                              : payment.status === "refunded"
                              ? "Reembolsado"
                              : payment.status === "cancelled"
                              ? "Cancelado"
                              : payment.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            Monto: {formatCurrency(Number(payment.amount))}{" "}
                            {payment.currency}
                          </p>
                          {payment.mercadoPagoPaymentId && (
                            <p className="text-xs text-gray-500 mt-1">
                              MP Payment ID: {payment.mercadoPagoPaymentId}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Cliente
                </h2>
                {order.lead ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Nombre</p>
                      <p className="font-medium text-gray-900">
                        {order.lead.name || "Sin nombre"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">
                        {order.lead.email}
                      </p>
                    </div>
                    {order.lead.dogSize && (
                      <div>
                        <p className="text-sm text-gray-500">Tamaño de perro</p>
                        <p className="font-medium text-gray-900">
                          {order.lead.dogSize}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Registrado</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(order.lead.createdAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No hay información del cliente</p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Resumen
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(Number(order.subtotal))}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento</span>
                      <span className="font-medium">
                        -{formatCurrency(Number(order.discount))}
                      </span>
                    </div>
                  )}
                  {order.discountCode && (
                    <div className="text-sm text-gray-500">
                      Código: {order.discountCode.code}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-medium">
                      {formatCurrency(Number(order.shippingCost))}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Dirección de Envío
                  </h2>
                  <div className="space-y-2 text-sm">
                    {typeof order.shippingAddress === "object" ? (
                      <>
                        <p className="font-medium text-gray-900">
                          {order.shippingAddress.street}
                        </p>
                        <p className="text-gray-600">
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.state}
                        </p>
                        <p className="text-gray-600">
                          {order.shippingAddress.zipCode}
                        </p>
                        <p className="text-gray-600">
                          {order.shippingAddress.country}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">
                        {String(order.shippingAddress)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {ToastView}
    </DashboardLayout>
  );
}
