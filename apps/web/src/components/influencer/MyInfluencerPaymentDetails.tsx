"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { InfluencerPaymentWithDetails } from "@/shared";
import { updateInfluencerPayment } from "@/lib/influencer-payment";
import { uploadInvoice, uploadContent } from "@/lib/upload";
import { useToast } from "@/components/ui/useToast";

interface MyInfluencerPaymentDetailsProps {
  payment: InfluencerPaymentWithDetails;
  onUpdate: () => void;
}

export function MyInfluencerPaymentDetails({
  payment,
  onUpdate,
}: MyInfluencerPaymentDetailsProps) {
  const { showToast, ToastView } = useToast();
  const [updating, setUpdating] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(payment.invoiceUrl || "");
  const [contentLinks, setContentLinks] = useState<string[]>(
    payment.contentLinks || []
  );
  const [newLink, setNewLink] = useState("");
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const invoiceFileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddLink = () => {
    if (newLink.trim()) {
      setContentLinks([...contentLinks, newLink.trim()]);
      setNewLink("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setContentLinks(contentLinks.filter((_, i) => i !== index));
  };

  const handleInvoiceFileChange = async (
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
      setUploadingInvoice(true);
      const result = await uploadInvoice(payment.id, file);
      setInvoiceUrl(result.url);
      showToast({ type: "success", message: "Factura subida correctamente" });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Error al subir la factura",
        durationMs: 6000,
      });
    } finally {
      setUploadingInvoice(false);
      if (invoiceFileInputRef.current) {
        invoiceFileInputRef.current.value = "";
      }
    }
  };

  const handleContentFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showToast({
        type: "error",
        message: "Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF)",
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
      setUploadingContent(true);
      const result = await uploadContent(payment.id, file);
      setContentLinks(result.links);
      showToast({ type: "success", message: "Imagen subida correctamente" });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Error al subir la imagen",
        durationMs: 6000,
      });
    } finally {
      setUploadingContent(false);
      if (contentFileInputRef.current) {
        contentFileInputRef.current.value = "";
      }
    }
  };

  const handleSaveContentLinks = async () => {
    try {
      setUpdating(true);
      await updateInfluencerPayment(payment.id, {
        contentLinks,
      });
      showToast({
        type: "success",
        message: "Links de contenido guardados correctamente",
      });
      onUpdate();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al guardar los links de contenido",
        durationMs: 6000,
      });
    } finally {
      setUpdating(false);
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

      {/* Comisiones Incluidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Comisiones Incluidas ({payment.commissions.length})
        </h2>
        <div className="space-y-3">
          {payment.commissions.map((commission) => (
            <div
              key={commission.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Código: {commission.discountCode.code}
                </p>
                <p className="text-xs text-gray-500">
                  Orden: {commission.orderId}
                </p>
              </div>
              <p className="text-sm font-semibold text-primary-turquoise">
                ${Number(commission.commissionAmount).toLocaleString()}
              </p>
            </div>
          ))}
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

      {/* Subir Factura */}
      {(payment.status === "pending" || payment.status === "invoice_rejected") && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Subir Factura
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivo
              </label>
              <input
                ref={invoiceFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInvoiceFileChange}
                disabled={uploadingInvoice}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-turquoise file:text-white hover:file:bg-primary-turquoise/90 file:cursor-pointer disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 10MB
              </p>
            </div>
            {uploadingInvoice && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-turquoise"></div>
                <span>Subiendo factura...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Factura Subida */}
      {payment.invoiceUrl && payment.status !== "invoice_rejected" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Factura</h2>
          <a
            href={payment.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-turquoise hover:underline"
          >
            Ver factura →
          </a>
        </div>
      )}

      {/* Mensaje cuando la factura fue rechazada */}
      {payment.status === "invoice_rejected" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-orange-900 mb-2">
            Factura Rechazada
          </h2>
          <p className="text-sm text-orange-800 mb-4">
            La factura anterior fue rechazada. Por favor, sube una nueva factura corregida.
          </p>
          {payment.invoiceRejectionReason && (
            <div className="bg-white/60 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-orange-900 mb-1">
                Motivo del rechazo:
              </p>
              <p className="text-sm text-orange-900 whitespace-pre-wrap">
                {payment.invoiceRejectionReason}
              </p>
            </div>
          )}
          {payment.invoiceUrl && (
            <a
              href={payment.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 hover:underline"
            >
              Ver factura rechazada →
            </a>
          )}
        </div>
      )}

      {/* Links de Contenido */}
      {(payment.status === "approved" || payment.status === "paid") && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Contenido Publicado
          </h2>
          <div className="space-y-4">
            {/* Subir Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subir Captura/Imagen
              </label>
              <input
                ref={contentFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                onChange={handleContentFileChange}
                disabled={uploadingContent}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-turquoise file:text-white hover:file:bg-primary-turquoise/90 file:cursor-pointer disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 10MB
              </p>
              {uploadingContent && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-turquoise"></div>
                  <span>Subiendo imagen...</span>
                </div>
              )}
            </div>

            {/* Agregar Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                O agregar Link de Red Social
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddLink();
                    }
                  }}
                />
                <button
                  onClick={handleAddLink}
                  disabled={!newLink.trim()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Guardar Links */}
            {newLink.trim() && (
              <button
                onClick={handleSaveContentLinks}
                disabled={updating}
                className="w-full px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Guardando..." : "Guardar Link"}
              </button>
            )}

            {/* Mostrar Contenido Subido */}
            {contentLinks.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Contenido Subido ({contentLinks.length})
                </label>
                <div className="space-y-2">
                  {contentLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                          <div className="relative w-16 h-16 rounded overflow-hidden">
                            <Image
                              src={link}
                              alt={`Contenido ${index + 1}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                              unoptimized
                            />
                          </div>
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
                      <button
                        onClick={() => handleRemoveLink(index)}
                        className="ml-2 text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comprobante de Pago (solo lectura) */}
      {payment.paymentProofUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comprobante de Pago
          </h2>
          <a
            href={payment.paymentProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-turquoise hover:underline"
          >
            Ver comprobante →
          </a>
        </div>
      )}
    </div>
  );
}
