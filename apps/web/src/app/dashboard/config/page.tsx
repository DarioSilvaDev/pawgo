"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CTAConfigForm } from "@/components/admin/CTAConfigForm";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConfigPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/dashboard");
        }
    }, [user, isAdmin, loading, router]);

    if (loading || !isAdmin) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Administra configuraciones globales de la aplicación
                    </p>
                </div>

                <div className="max-w-2xl">
                    <CTAConfigForm />
                </div>
            </div>
        </DashboardLayout>
    );
}
