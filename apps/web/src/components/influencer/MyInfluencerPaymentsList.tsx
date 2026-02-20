"use client";

import { InfluencerPaymentWithDetails } from "@/shared";
import Link from "next/link";

interface MyInfluencerPaymentsListProps {
  payments: InfluencerPaymentWithDetails[];
  loading: boolean;
  onUpdate: () => void;
}

export function MyInfluencerPaymentsList({
  payments,
  loading,
  onUpdate,
}: MyInfluencerPaymentsListProps) {
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise mx-auto"></div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No tienes pagos registrados
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {payments.map((payment) => (
        <div key={payment.id} className="p-6 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    payment.status
                  )}`}
                >
                  {getStatusLabel(payment.status)}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(payment.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>
              <div className="mb-2">
                <div className="text-lg font-semibold text-gray-900">
                  ${Number(payment.totalAmount).toLocaleString()} {payment.currency}
                </div>
                <div className="text-sm text-gray-600">
                  {payment.commissions.length} comisión(es) •{" "}
                  {payment.paymentMethod === "transfer"
                    ? "Transferencia Bancaria"
                    : "MercadoPago"}
                </div>
              </div>
              {payment.commissions.length > 0 && (
                <div className="mt-3 space-y-1">
                  {payment.commissions.slice(0, 3).map((commission) => (
                    <div
                      key={commission.id}
                      className="text-xs text-gray-600 flex items-center space-x-2"
                    >
                      <span>•</span>
                      <span>
                        {commission.discountCode.code}: $
                        {Number(commission.commissionAmount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {payment.commissions.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{payment.commissions.length - 3} más
                    </div>
                  )}
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/influencer/payments/${payment.id}`}
              className="ml-4 px-4 py-2 text-sm font-medium text-primary-turquoise hover:text-primary-turquoise/80 border border-primary-turquoise rounded-lg hover:bg-primary-turquoise/5 transition-colors"
            >
              Ver Detalles
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

