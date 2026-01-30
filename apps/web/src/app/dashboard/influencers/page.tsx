"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencersList } from "@/components/admin/InfluencersList";
import Link from "next/link";

export default function InfluencersPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Influencers</h1>
            <Link
              href="/dashboard/influencers/new"
              className="px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors"
            >
              + Nuevo Influencer
            </Link>
          </div>
          <InfluencersList />
        </div>
      </div>
    </DashboardLayout>
  );
}
