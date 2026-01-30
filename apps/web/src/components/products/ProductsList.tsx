"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProducts, deleteProduct, type Product } from "@/lib/product";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { formatPrice } from "@/lib/pricing";

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { showToast, ToastView } = useToast();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(
    undefined
  );

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { isActive?: boolean; search?: string } = {};
      if (filterActive !== undefined) filters.isActive = filterActive;
      if (search) filters.search = search;

      const data = await getProducts(filters);
      setProducts(data.products);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar productos",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [filterActive, search, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar producto",
      message: "¿Estás seguro de que deseas eliminar este producto?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al eliminar producto",
      });
    }
  };

  if (loading) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      {ToastView}
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
          />
          <select
            value={filterActive === undefined ? "all" : filterActive.toString()}
            onChange={(e) =>
              setFilterActive(
                e.target.value === "all"
                  ? undefined
                  : e.target.value === "true"
              )
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay productos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {product.images && product.images.length > 0 && (
                <div className="relative h-48 bg-gray-200">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-col">
                    {product.launchPrice != null && product.launchPrice > 0 ? (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(product.basePrice, product.currency)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary-turquoise">
                            {formatPrice(product.launchPrice, product.currency)}
                          </span>
                          <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            🚀 Lanzamiento
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary-turquoise">
                        {formatPrice(product.basePrice, product.currency)}
                      </span>
                    )}
                  </div>
                  {product.variants && product.variants.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {product.variants.length} variante
                      {product.variants.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="flex-1 px-3 py-2 text-sm font-medium text-center text-primary-turquoise bg-primary-turquoise/10 rounded-lg hover:bg-primary-turquoise/20 transition-colors"
                  >
                    Ver/Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

