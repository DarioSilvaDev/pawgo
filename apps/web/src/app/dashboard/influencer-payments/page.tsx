"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencerPaymentsList } from "@/components/admin/InfluencerPaymentsList";
import { CreateInfluencerPaymentForm } from "@/components/admin/CreateInfluencerPaymentForm";
import { InfluencerPaymentWithDetails } from "@/shared";
import { getInfluencerPayments } from "@/lib/influencer-payment";

export default function InfluencerPaymentsPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<InfluencerPaymentWithDetails[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const data = await getInfluencerPayments({
        status: selectedStatus || undefined,
      });
      setPayments(data);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
    }
  }, [isAdmin, loadPayments]);

  const handlePaymentCreated = () => {
    setShowCreateForm(false);
    loadPayments();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pagos a Influencers
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona los pagos de comisiones a influencers
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors font-medium"
          >
            {showCreateForm ? "Cancelar" : "+ Crear Pago"}
          </button>
        </div>

        {showCreateForm && (
          <CreateInfluencerPaymentForm
            onSuccess={handlePaymentCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de Pagos
              </h2>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-turquoise"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="invoice_uploaded">Factura Subida</option>
                <option value="approved">Aprobado</option>
                <option value="paid">Pagado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <InfluencerPaymentsList
            payments={payments}
            loading={loadingPayments}
            onUpdate={loadPayments}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
