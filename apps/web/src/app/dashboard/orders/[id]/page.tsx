"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  getOrderDetails,
  addTrackingNumber,
  updateOrderStatus,
  type Order,
} from "@/lib/order";
import { useToast } from "@/components/ui/useToast";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-yellow-100 text-yellow-800",
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  ready_to_ship: "bg-orange-100 text-orange-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Esperando pago",
  pending: "Pendiente",
  paid: "Pago confirmado",
  ready_to_ship: "Preparado para envío",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

// ─────────────────────────────────────────────────────────────
// TrackingSection — Panel de gestión de envío (admin only)
// ─────────────────────────────────────────────────────────────
function TrackingSection({
  order,
  onSuccess,
}: {
  order: Order;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [confirmingReady, setConfirmingReady] = useState(false);
  const [confirmingShip, setConfirmingShip] = useState(false);

  const trackingNumber = order.shipment?.trackingNumber;
  const status = order.status;

  // ── shipped con tracking → mostrar info readonly
  if (status === "shipped" && trackingNumber) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📦</span> Envío
        </h2>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
            ✓ Enviado
          </span>
        </div>
        <div className="bg-white border border-purple-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Número de seguimiento</p>
          <p className="text-2xl font-bold text-purple-700 tracking-widest">
            {trackingNumber}
          </p>
        </div>
        <a
          href={`https://www.correoargentino.com.ar/formularios/odi?numero=${trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 font-medium"
        >
          🔍 Rastrear en Correo Argentino ↗
        </a>
      </div>
    );
  }

  // ── shipped sin tracking
  if (status === "shipped" && !trackingNumber) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">📦 Envío</h2>
        <p className="text-sm text-gray-500">
          Enviado (sin número de tracking registrado)
        </p>
      </div>
    );
  }

  // ── Solo paid o ready_to_ship muestran acciones
  if (status !== "paid" && status !== "ready_to_ship") {
    return null;
  }

  const handleMarkReady = async () => {
    setLoadingStatus(true);
    try {
      await updateOrderStatus(order.id, "ready_to_ship");
      showToast({
        type: "success",
        message: "✅ Orden marcada como preparada para envío.",
      });
      onSuccess();
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al actualizar el estado",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleAddTracking = async () => {
    const cleaned = trackingInput.trim().toUpperCase();
    if (!cleaned) {
      setTrackingError("El número de seguimiento es requerido.");
      return;
    }
    if (!/^[A-Z0-9]+$/i.test(cleaned)) {
      setTrackingError("Solo se permiten letras y números.");
      return;
    }
    setTrackingError(null);
    setLoadingTracking(true);
    try {
      await addTrackingNumber(order.id, cleaned);
      showToast({
        type: "success",
        message: "✅ Tracking guardado. Email enviado al cliente.",
      });
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar el tracking";
      setTrackingError(msg);
      showToast({ type: "error", message: `❌ ${msg}` });
    } finally {
      setLoadingTracking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>📦</span> Gestión de envío
      </h2>

      <div className="space-y-3">
        {/* Acción 1: paid → ready_to_ship */}
        {status === "paid" && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-800">
                📋 ¿Ya preparaste el paquete?
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Marcalo como preparado cuando esté listo para llevar al correo.
              </p>
            </div>

            {!confirmingReady ? (
              <button
                onClick={() => setConfirmingReady(true)}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Marcar como preparado
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3">
                <span className="text-yellow-700 text-sm font-medium">⚠️ ¿Confirmás este cambio de estado?</span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleMarkReady}
                    disabled={loadingStatus}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingStatus ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                        Guardando...
                      </span>
                    ) : (
                      "Sí, confirmar"
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmingReady(false)}
                    disabled={loadingStatus}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acción 2: cargar tracking (paid y ready_to_ship) */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-gray-800 mb-1">
            🚚 ¿Ya despachaste el paquete en Correo Argentino?
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Cargá el número de seguimiento del comprobante. El cliente recibirá
            un email automáticamente.
          </p>

          {!showTrackingInput ? (
            <button
              onClick={() => setShowTrackingInput(true)}
              className="px-4 py-2 bg-primary-turquoise text-white text-sm font-medium rounded-lg hover:bg-primary-turquoise/90 transition-colors"
            >
              Cargar seguimiento
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => {
                    setTrackingInput(e.target.value);
                    setTrackingError(null);
                    setConfirmingShip(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !confirmingShip && trackingInput.trim()) {
                      setConfirmingShip(true);
                    }
                  }}
                  placeholder="Ej: RE123456789AR"
                  disabled={loadingTracking}
                  autoFocus
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-turquoise uppercase disabled:opacity-50"
                />
                {!confirmingShip ? (
                  <button
                    onClick={() => {
                      if (!trackingInput.trim()) {
                        setTrackingError("El número de seguimiento es requerido.");
                        return;
                      }
                      if (!/^[A-Z0-9]+$/i.test(trackingInput.trim())) {
                        setTrackingError("Solo se permiten letras y números.");
                        return;
                      }
                      setTrackingError(null);
                      setConfirmingShip(true);
                    }}
                    disabled={loadingTracking || !trackingInput.trim()}
                    className="px-4 py-2 bg-primary-turquoise text-white text-sm font-medium rounded-lg hover:bg-primary-turquoise/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirmar envío
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setShowTrackingInput(false);
                    setTrackingInput("");
                    setTrackingError(null);
                    setConfirmingShip(false);
                  }}
                  disabled={loadingTracking}
                  className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
              {trackingError && (
                <p className="text-red-600 text-xs mt-1">⚠️ {trackingError}</p>
              )}
              {confirmingShip && (
                <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3">
                  <span className="text-yellow-700 text-sm font-medium">
                    ⚠️ Se cambiará el estado a <strong>Enviado</strong> y se notificará al cliente. ¿Confirmás?
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={handleAddTracking}
                      disabled={loadingTracking}
                      className="px-3 py-1.5 bg-primary-turquoise text-white text-sm font-medium rounded-lg hover:bg-primary-turquoise/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingTracking ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                          Enviando...
                        </span>
                      ) : (
                        "Sí, enviar"
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmingShip(false)}
                      disabled={loadingTracking}
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OrderDetailsPage
// ─────────────────────────────────────────────────────────────
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

  if (!user || !isAdmin) return null;

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
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
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
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm no-print"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir etiqueta
              </button>
            </div>
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
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Creada: {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* TrackingSection — admin shipping actions */}
              <TrackingSection order={order} onSuccess={loadOrder} />

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
                                {" "}- {item.productVariant.name}
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
                    <p className="text-gray-500">
                      No hay productos en esta orden
                    </p>
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
                            {payment.paymentType && (
                              <p className="text-xs text-gray-500 capitalize">
                                Tipo comercial: {payment.paymentType === "card" ? "tarjeta" : "contado"}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              ID: {payment.id.slice(0, 8)}...
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_COLORS[payment.status] ||
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
                  <p className="text-gray-500">
                    No hay información del cliente
                  </p>
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 no-print">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Dirección de Envío
                  </h2>
                  <div className="space-y-2 text-sm">
                    {typeof order.shippingAddress === "object" ? (
                      <>
                        <p className="font-medium text-gray-900">
                          {order.shippingAddress.street}
                          {order.shippingAddress.floor && `, Piso ${order.shippingAddress.floor}`}
                          {order.shippingAddress.apartment && ` Dpto. ${order.shippingAddress.apartment}`}
                        </p>
                        <p className="text-gray-600">
                          {order.shippingAddress.city}, {order.shippingAddress.state}
                        </p>
                        <p className="text-gray-600">
                          CP: {order.shippingAddress.zipCode}
                        </p>
                        <p className="text-gray-600">
                          {order.shippingAddress.country}
                        </p>
                        {order.shippingAddress.addressNotes && (
                          <div className="pt-2 mt-2 border-t border-gray-100 italic text-gray-500">
                            <span className="font-medium text-gray-700 not-italic">Obs:</span> {order.shippingAddress.addressNotes}
                          </div>
                        )}
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

      {/* Print Label - Only visible in print */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black">
        <PrintLabel order={order} />

        <style jsx global>{`
          @media print {
            body { 
              background: white !important; 
              color: black !important;
            }
            .no-print { display: none !important; }
            header, footer, nav, aside { display: none !important; }
            #main-content { margin: 0 !important; border: 0 !important; width: 100% !important; }
            /* Hide anything inside DashboardLayout that isn't the print-label */
            div > div.dashboard-content-wrapper { display: none !important; }
            /* Root container hide */
            #__next, main { margin: 0 !important; padding: 0 !important; }
            @page {
              size: A6;
              margin: 8mm;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

function PrintLabel({ order }: { order: Order }) {
  const addr = order.shippingAddress as any;
  const lead = order.lead as any;

  if (!addr) return null;

  return (
    <div className="border-[3px] border-black p-6 h-full flex flex-col font-sans bg-white" style={{ height: 'calc(100vh - 10mm)' }}>
      {/* Destinatario */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase border-b-2 border-black mb-2 tracking-wider">Destinatario</h3>
        <p className="text-4xl font-black leading-tight mb-1">
          {lead?.name} {lead?.lastName}
        </p>
        {lead?.phoneNumber && (
          <p className="text-2xl font-bold italic">Tel: {lead.phoneNumber}</p>
        )}
      </div>

      {/* Dirección */}
      <div className="mb-8 flex-1">
        <h3 className="text-sm font-bold uppercase border-b-2 border-black mb-2 tracking-wider">Dirección de Envío</h3>
        <p className="text-3xl font-bold leading-tight mb-2">
          {addr.street}
          {addr.floor && `, Piso ${addr.floor}`}
          {addr.apartment && ` Dpto. ${addr.apartment}`}
        </p>
        <p className="text-3xl uppercase font-black mb-4">
          {addr.city}, {addr.state}
        </p>
        <div className="inline-block border-4 border-black px-4 py-2 mt-2">
          <p className="text-5xl font-black">
            CP: {addr.zipCode}
          </p>
        </div>
        <p className="text-sm mt-4 uppercase font-bold text-gray-700">{addr.country}</p>

        {addr.addressNotes && (
          <div className="mt-8 p-4 bg-gray-50 border-2 border-black rounded-lg">
            <p className="text-xs font-bold uppercase mb-1 leading-none">Observaciones de entrega:</p>
            <p className="text-lg leading-snug font-medium italic underline decoration-1 underline-offset-4">{addr.addressNotes}</p>
          </div>
        )}
      </div>

      {/* Footer Label */}
      <div className="mt-auto pt-6 border-t-[3px] border-dashed border-black">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs font-bold uppercase mb-1">Orden de Compra #</p>
            <p className="text-2xl font-black font-mono tracking-tighter bg-black text-white px-2">
              {order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black italic tracking-tighter">PAWGO 🐾</p>
            <p className="text-[10px] font-bold uppercase">Tienda Online</p>
          </div>
        </div>

        {/* Simplified Items for Prep */}
        <div className="mt-2 text-xs font-bold text-gray-800 border-t border-black/20 pt-2">
          PRODUCTOS: {order.items?.map(i => `${i.quantity}x ${i.product?.name ?? i.name}`).join(' | ')}
        </div>
      </div>
    </div>
  );
}

