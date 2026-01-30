"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencerPaymentDetails } from "@/components/admin/InfluencerPaymentDetails";
import { InfluencerPaymentWithDetails } from "@pawgo/shared";
import { getInfluencerPaymentById } from "@/lib/influencer-payment";

export default function InfluencerPaymentDetailPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const paymentId = params?.id as string;
  const [payment, setPayment] = useState<InfluencerPaymentWithDetails | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  const loadPayment = useCallback(async () => {
    try {
      setLoadingPayment(true);
      setError("");
      const data = await getInfluencerPaymentById(paymentId);
      setPayment(data);
    } catch (error) {
      console.error("Error loading payment:", error);
      setError(
        error instanceof Error ? error.message : "Error al cargar el pago"
      );
    } finally {
      setLoadingPayment(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (isAdmin && paymentId) {
      loadPayment();
    }
  }, [isAdmin, paymentId, loadPayment]);

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

  if (loadingPayment) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Error al cargar el pago
            </h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push("/dashboard/influencer-payments")}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Volver a Pagos
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payment) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              Pago no encontrado
            </h2>
            <p className="text-yellow-700">
              El pago que buscas no existe o no tienes permisos para verlo.
            </p>
            <button
              onClick={() => router.push("/dashboard/influencer-payments")}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Volver a Pagos
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard/influencer-payments")}
              className="text-sm text-gray-600 hover:text-primary-turquoise mb-2 flex items-center"
            >
              ← Volver a Pagos
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Detalles del Pago
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              ID: {payment.id}
            </p>
          </div>
        </div>

        <InfluencerPaymentDetails
          payment={payment}
          onUpdate={loadPayment}
        />
      </div>
    </DashboardLayout>
  );
}

