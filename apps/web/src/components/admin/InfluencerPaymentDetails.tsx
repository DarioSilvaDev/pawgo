"use client";

import { useState, useRef } from "react";
import { InfluencerPaymentWithDetails } from "@pawgo/shared";
import { updateInfluencerPayment } from "@/lib/influencer-payment";
import { uploadPaymentProof } from "@/lib/upload";
import { useToast } from "@/components/ui/useToast";

interface InfluencerPaymentDetailsProps {
  payment: InfluencerPaymentWithDetails;
  onUpdate: () => void;
}

export function InfluencerPaymentDetails({
  payment,
  onUpdate,
}: InfluencerPaymentDetailsProps) {
  const { showToast, ToastView } = useToast();
  const [updating, setUpdating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [invoiceRejectionReason, setInvoiceRejectionReason] = useState(
    payment.invoiceRejectionReason || ""
  );
  const proofFileInputRef = useRef<HTMLInputElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "invoice_uploaded":
        return "bg-blue-100 text-blue-800";
      case "invoice_rejected":
        return "bg-orange-100 text-orange-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "paid":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "invoice_uploaded":
        return "Factura Subida";
      case "invoice_rejected":
        return "Factura Rechazada";
      case "approved":
        return "Aprobado";
      case "paid":
        return "Pagado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const handleStatusChange = async (
    newStatus: InfluencerPaymentWithDetails["status"]
  ) => {
    try {
      setUpdating(true);
      await updateInfluencerPayment(payment.id, { status: newStatus });
      showToast({ type: "success", message: "Estado actualizado correctamente" });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Error al actualizar el estado",
        durationMs: 6000,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectInvoice = async () => {
    const reason = invoiceRejectionReason.trim();
    if (!reason) {
      showToast({
        type: "error",
        message: "Debes indicar un motivo/observación para rechazar la factura",
        durationMs: 6000,
      });
      return;
    }

    try {
      setUpdating(true);
      await updateInfluencerPayment(payment.id, {
        status: "invoice_rejected",
        invoiceRejectionReason: reason,
      });
      showToast({ type: "success", message: "Factura rechazada correctamente" });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Error al rechazar la factura",
        durationMs: 6000,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleProofFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      showToast({
        type: "error",
        message: "Tipo de archivo no permitido. Solo PDF, JPG, PNG",
        durationMs: 6000,
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast({
        type: "error",
        message: "El archivo es demasiado grande. Tamaño máximo: 10MB",
        durationMs: 6000,
      });
      return;
    }

    try {
      setUploadingProof(true);
      const result = await uploadPaymentProof(payment.id, file);
      void result;
      showToast({ type: "success", message: "Comprobante subido correctamente" });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Error al subir el comprobante",
        durationMs: 6000,
      });
    } finally {
      setUploadingProof(false);
      if (proofFileInputRef.current) {
        proofFileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {ToastView}
      {/* Información General */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Información General
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Influencer
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {payment.influencer.name}
            </p>
            <p className="text-xs text-gray-500">{payment.influencer.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Estado</label>
            <div className="mt-1">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  payment.status
                )}`}
              >
                {getStatusLabel(payment.status)}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Monto Total
            </label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ${Number(payment.totalAmount).toLocaleString()} {payment.currency}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Método de Pago
            </label>
            <p className="mt-1 text-sm text-gray-900 capitalize">
              {payment.paymentMethod === "transfer"
                ? "Transferencia Bancaria"
                : "MercadoPago"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Fecha de Solicitud
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(payment.requestedAt).toLocaleDateString("es-AR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {payment.paidAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de Pago
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(payment.paidAt).toLocaleDateString("es-AR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Datos de Pago */}
      {(payment.accountNumber ||
        payment.cvu ||
        payment.bankName ||
        payment.mercadopagoEmail) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Datos de Pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {payment.accountNumber && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Número de Cuenta
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {payment.accountNumber}
                </p>
              </div>
            )}
            {payment.cvu && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  CVU/CBU
                </label>
                <p className="mt-1 text-sm text-gray-900">{payment.cvu}</p>
              </div>
            )}
            {payment.bankName && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Banco
                </label>
                <p className="mt-1 text-sm text-gray-900">{payment.bankName}</p>
              </div>
            )}
            {payment.mercadopagoEmail && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email MercadoPago
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {payment.mercadopagoEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comisiones Incluidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Comisiones Incluidas ({payment.commissions.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payment.commissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {commission.discountCode.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {commission.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-turquoise">
                    ${Number(commission.commissionAmount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total:</span>
            <span className="text-lg font-bold text-primary-turquoise">
              ${Number(payment.totalAmount).toLocaleString()} {payment.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documentos</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Factura
            </label>
            {payment.invoiceUrl ? (
              <div className="flex items-center space-x-3">
                <a
                  href={payment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-turquoise hover:underline"
                >
                  Ver factura →
                </a>
                {(payment.invoiceUrl.startsWith("http://") ||
                  payment.invoiceUrl.startsWith("https://")) && (
                  <img
                    src={payment.invoiceUrl}
                    alt="Factura"
                    className="w-20 h-20 object-cover rounded border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay factura subida</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante de Pago
            </label>
            {payment.paymentProofUrl ? (
              <div className="flex items-center space-x-3">
                <a
                  href={payment.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-turquoise hover:underline"
                >
                  Ver comprobante →
                </a>
                {(payment.paymentProofUrl.startsWith("http://") ||
                  payment.paymentProofUrl.startsWith("https://")) && (
                  <img
                    src={payment.paymentProofUrl}
                    alt="Comprobante"
                    className="w-20 h-20 object-cover rounded border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            ) : payment.status === "approved" || payment.status === "paid" ? (
              <div className="space-y-2">
                <input
                  ref={proofFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleProofFileChange}
                  disabled={uploadingProof}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-turquoise file:text-white hover:file:bg-primary-turquoise/90 file:cursor-pointer disabled:opacity-50"
                />
                <p className="text-xs text-gray-500">
                  Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 10MB
                </p>
                {uploadingProof && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-turquoise"></div>
                    <span>Subiendo comprobante...</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay comprobante subido</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenido Publicado
            </label>
            {payment.contentLinks && payment.contentLinks.length > 0 ? (
              <div className="space-y-2">
                {payment.contentLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                  >
                    {link.startsWith("http://") ||
                    link.startsWith("https://") ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-turquoise hover:underline flex-1"
                      >
                        {link}
                      </a>
                    ) : (
                      <div className="flex items-center space-x-2 flex-1">
                        <img
                          src={link}
                          alt={`Contenido ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-turquoise hover:underline"
                        >
                          Ver imagen →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay contenido subido</p>
            )}
          </div>
        </div>
      </div>

      {/* Acciones */}
      {payment.status !== "paid" && payment.status !== "cancelled" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones</h2>
          <div className="space-y-4">
            {/* Mensaje informativo cuando no hay factura */}
            {payment.status === "pending" && !payment.invoiceUrl && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⏳ Esperando que el influencer suba la factura para poder aprobar el pago.
                </p>
              </div>
            )}

            {/* Mensaje cuando la factura fue rechazada */}
            {payment.status === "invoice_rejected" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  ⚠️ La factura fue rechazada. El influencer puede subir una nueva factura.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Solo se puede aprobar cuando hay factura subida */}
              {payment.status === "invoice_uploaded" && (
                <>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo/observación (obligatorio para rechazo)
                    </label>
                    <textarea
                      value={invoiceRejectionReason}
                      onChange={(e) => setInvoiceRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                      placeholder="Ej: Falta CUIT, monto no coincide, datos incompletos..."
                      disabled={updating}
                    />
                  </div>
                  <button
                    onClick={() => handleStatusChange("approved")}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? "Actualizando..." : "✓ Aprobar Pago"}
                  </button>
                  <button
                    onClick={handleRejectInvoice}
                    disabled={updating || !invoiceRejectionReason.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? "Actualizando..." : "✗ Rechazar Factura"}
                  </button>
                </>
              )}

              {/* Cuando está aprobado, se puede marcar como pagado */}
              {payment.status === "approved" && (
                <button
                  onClick={() => handleStatusChange("paid")}
                  disabled={updating}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Actualizando..." : "Marcar como Pagado"}
                </button>
              )}

              {/* Cuando la factura fue rechazada, se puede volver a invoice_uploaded si el influencer sube nueva factura */}
              {payment.status === "invoice_rejected" && payment.invoiceUrl && (
                <button
                  onClick={() => handleStatusChange("invoice_uploaded")}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Actualizando..." : "Revisar Nueva Factura"}
                </button>
              )}

              {/* Cancelar (bloque ya se oculta si está pagado/cancelado) */}
              <button
                onClick={() => handleStatusChange("cancelled")}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Actualizando..." : "Cancelar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
