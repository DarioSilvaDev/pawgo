"use client";

import { useState } from "react";
import { InfluencerPaymentWithDetails } from "@pawgo/shared";
import Link from "next/link";

interface InfluencerPaymentsListProps {
  payments: InfluencerPaymentWithDetails[];
  loading: boolean;
  onUpdate: () => void;
}

export function InfluencerPaymentsList({
  payments,
  loading,
  onUpdate,
}: InfluencerPaymentsListProps) {
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
        No hay pagos registrados
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Influencer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monto
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Método
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {payment.influencer.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {payment.influencer.email}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900">
                  ${Number(payment.totalAmount).toLocaleString()} {payment.currency}
                </div>
                <div className="text-xs text-gray-500">
                  {payment.commissions.length} comisión(es)
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-700 capitalize">
                  {payment.paymentMethod === "transfer"
                    ? "Transferencia"
                    : "MercadoPago"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    payment.status
                  )}`}
                >
                  {getStatusLabel(payment.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(payment.createdAt).toLocaleDateString("es-AR")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/dashboard/influencer-payments/${payment.id}`}
                  className="text-primary-turquoise hover:text-primary-turquoise/80"
                >
                  Ver Detalles
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

