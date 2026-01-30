"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductVariants } from "@/components/products/ProductVariants";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <DashboardLayout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/dashboard/products"
              className="text-primary-turquoise hover:text-primary-turquoise/80 mb-4 inline-block"
            >
              ← Volver a Productos
            </Link>
          </div>
          <div className="space-y-8">
            <ProductForm productId={id} />
            <ProductVariants productId={id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
