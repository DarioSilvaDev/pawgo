"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  type ProductVariant,
  type CreateProductVariantDto,
  type UpdateProductVariantDto,
} from "@/lib/product";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useToast } from "@/components/ui/useToast";

interface ProductVariantsProps {
  productId: string;
}

export function ProductVariants({ productId }: ProductVariantsProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { showToast, ToastView } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: "",
    size: "",
    price: "",
    stock: "",
    sku: "",
    isActive: true,
  });

  const loadVariants = useCallback(async () => {
    try {
      setLoading(true);
      const product = await getProduct(productId);
      setVariants(product.variants || []);
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar variantes",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        name: formData.name,
        size: formData.size || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        sku: formData.sku || undefined,
        isActive: formData.isActive,
      };

      if (editingVariant) {
        await updateVariant(editingVariant.id, data as UpdateProductVariantDto);
        showToast({ type: "success", message: "Variante actualizada correctamente" });
      } else {
        await createVariant(productId, data as CreateProductVariantDto);
        showToast({ type: "success", message: "Variante creada correctamente" });
      }

      resetForm();
      await loadVariants();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al guardar variante",
        durationMs: 6000,
      });
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      size: variant.size || "",
      price: variant.price?.toString() || "",
      stock: variant.stock?.toString() || "",
      sku: variant.sku || "",
      isActive: variant.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (variantId: string) => {
    const ok = await confirm({
      title: "Eliminar variante",
      message: "¿Estás seguro de que deseas eliminar esta variante?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteVariant(variantId);
      await loadVariants();
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al eliminar variante",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      size: "",
      price: "",
      stock: "",
      sku: "",
      isActive: true,
    });
    setEditingVariant(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {ConfirmDialog}
      {ToastView}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Variantes del Producto</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors"
        >
          + Nueva Variante
        </button>
      </div>

      {/* Formulario de Variante */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingVariant ? "Editar Variante" : "Nueva Variante"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                  placeholder="Ej: Pequeño, Mediano, Grande"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamaño (opcional)
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                  placeholder="Ej: S, M, L"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio especial (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                  placeholder="Dejar vacío para usar precio base"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Si no se especifica, se usa el precio base del producto
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (opcional)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="variantIsActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-turquoise border-gray-300 rounded focus:ring-primary-turquoise"
                />
                <label
                  htmlFor="variantIsActive"
                  className="ml-2 text-sm text-gray-700"
                >
                  Variante activa
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-turquoise rounded-lg hover:bg-primary-turquoise/90"
              >
                {editingVariant ? "Actualizar" : "Crear Variante"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Variantes */}
      {variants.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No hay variantes registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {variant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.size || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.price != null
                        ? `ARS ${Number(variant.price).toLocaleString("es-AR")}`
                        : <span className="text-gray-400 italic">Usa precio base</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.stock !== null && variant.stock !== undefined
                        ? variant.stock
                        : "Sin límite"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.sku || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          variant.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {variant.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(variant)}
                        className="text-primary-turquoise hover:text-primary-turquoise/80 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(variant.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

