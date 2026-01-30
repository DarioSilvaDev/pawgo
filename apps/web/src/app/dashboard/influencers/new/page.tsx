"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencerForm } from "@/components/admin/InfluencerForm";

export default function NewInfluencerPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InfluencerForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
