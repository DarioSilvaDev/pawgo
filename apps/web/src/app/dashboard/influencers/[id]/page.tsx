"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InfluencerForm } from "@/components/admin/InfluencerForm";
import { useParams } from "next/navigation";

export default function EditInfluencerPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <InfluencerForm influencerId={id} />
        </div>
      </div>
    </DashboardLayout>
  );
}
