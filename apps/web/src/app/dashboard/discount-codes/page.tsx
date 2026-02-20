"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DiscountCodesList } from "@/components/admin/DiscountCodesList";
import { CreateDiscountCodeForm } from "@/components/admin/CreateDiscountCodeForm";
import { LeadDiscountConfigForm } from "@/components/admin/LeadDiscountConfigForm";
import { Toast } from "@/components/ui/Toast";

export default function DiscountCodesPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {toastMessage && (
          <Toast
            type="success"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Códigos de Descuento
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona los códigos de descuento para influencers y leads
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              + Crear Código
            </button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Crear Nuevo Código de Descuento
            </h2>
            <CreateDiscountCodeForm
              onSuccess={() => {
                setShowCreateForm(false);
                setRefreshKey((k) => k + 1);
                setToastMessage("Código de descuento creado correctamente");
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Codes List */}
        <DiscountCodesList refreshKey={refreshKey} />

        {/* Lead Discount Config */}
        <LeadDiscountConfigForm />
      </div>
    </DashboardLayout>
  );
}

