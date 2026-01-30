"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProductForm } from "@/components/products/ProductForm";

export default function NewProductPage() {
  return (
    <DashboardLayout>
      <div className="py-8">
        <ProductForm />
      </div>
    </DashboardLayout>
  );
}

