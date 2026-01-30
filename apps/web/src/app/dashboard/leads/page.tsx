"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadsList } from "@/components/leads/LeadsList";

export default function LeadsPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          </div>
          <LeadsList />
        </div>
      </div>
    </DashboardLayout>
  );
}

