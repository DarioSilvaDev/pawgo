"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <AnalyticsDashboard />
      </div>
    </DashboardLayout>
  );
}

