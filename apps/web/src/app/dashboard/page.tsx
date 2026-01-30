"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencerDashboard } from "@/components/dashboard/InfluencerDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function DashboardPage() {
  const { user, loading, isAdmin, isInfluencer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  // Render dashboard based on role
  if (isInfluencer) {
    return (
      <DashboardLayout>
        <InfluencerDashboard />
      </DashboardLayout>
    );
  }

  if (isAdmin) {
    return (
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Bienvenido, {user.name || user.email}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600">Tu dashboard personalizado</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
