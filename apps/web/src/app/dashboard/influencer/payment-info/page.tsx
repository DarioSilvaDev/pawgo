"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PaymentInfoForm } from "@/components/influencer/PaymentInfoForm";

export default function PaymentInfoPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <PaymentInfoForm />
      </div>
    </DashboardLayout>
  );
}

