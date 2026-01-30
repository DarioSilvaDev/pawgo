"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MyInfluencerPaymentsList } from "@/components/influencer/MyInfluencerPaymentsList";
import { InfluencerPaymentWithDetails } from "@pawgo/shared";
import { getMyInfluencerPayments } from "@/lib/influencer-payment";

export default function MyInfluencerPaymentsPage() {
  const { user, loading, isInfluencer } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<InfluencerPaymentWithDetails[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isInfluencer)) {
      router.push("/dashboard");
    }
  }, [user, loading, isInfluencer, router]);

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const data = await getMyInfluencerPayments();
      setPayments(data);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    if (isInfluencer) {
      loadPayments();
    }
  }, [isInfluencer, loadPayments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  if (!user || !isInfluencer) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Pagos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Visualiza y gestiona tus pagos de comisiones
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <MyInfluencerPaymentsList
            payments={payments}
            loading={loadingPayments}
            onUpdate={loadPayments}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
