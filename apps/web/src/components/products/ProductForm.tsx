"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  type Product,
  type CreateProductDto,
  type UpdateProductDto,
  downloadImage,
} from "@/lib/product";
import { useToast } from "@/components/ui/useToast";

interface ProductFormProps {
  productId?: string;
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const { showToast, ToastView } = useToast();
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
    launchPrice: "", // Precio de lanzamiento (opcional)
    cashPrice: "",
    currency: "ARS",
    images: [] as string[],
    isActive: true,
  });

  const [uploadingImages, setUploadingImages] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      const product = await getProduct(productId);
      setFormData({
        name: product.name,
        description: product.description,
        basePrice: product.basePrice.toString(),
        launchPrice: product.launchPrice?.toString() || "",
        cashPrice: product.cashPrice.toString(),
        currency: product.currency,
        images: product.images || [],
        isActive: product.isActive,
      });
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar producto",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId, loadProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validar que launchPrice <= basePrice si existe
      const basePriceNum = parseFloat(formData.basePrice);
      const cashPriceNum = parseFloat(formData.cashPrice);

      // Manejar launchPrice: si está vacío o es NaN, usar null; si tiene valor, parsear
      let launchPriceNum: number | null = null;
      if (formData.launchPrice && formData.launchPrice.trim() !== "") {
        const parsed = parseFloat(formData.launchPrice);
        if (!isNaN(parsed) && parsed > 0) {
          launchPriceNum = parsed;
        }
      }

      if (launchPriceNum !== null && launchPriceNum > basePriceNum) {
        showToast({
          type: "error",
          message:
            "El precio de lanzamiento debe ser menor o igual al precio base",
          durationMs: 5000,
        });
        setSaving(false);
        return;
      }

      const cardReference = launchPriceNum ?? basePriceNum;
      if (isNaN(cashPriceNum) || cashPriceNum <= 0) {
        showToast({
          type: "error",
          message: "El precio contado debe ser mayor a 0",
          durationMs: 5000,
        });
        setSaving(false);
        return;
      }

      if (cashPriceNum > cardReference) {
        showToast({
          type: "error",
          message: "El precio contado debe ser menor o igual al precio tarjeta",
          durationMs: 5000,
        });
        setSaving(false);
        return;
      }

      const data = {
        name: formData.name,
        description: formData.description,
        basePrice: basePriceNum,
        launchPrice: launchPriceNum, // null si está vacío (para remover), número si tiene valor
        cashPrice: cashPriceNum,
        currency: formData.currency,
        images: formData.images,
        isActive: formData.isActive,
      };

      if (productId) {
        await updateProduct(productId, data as UpdateProductDto);
        showToast({
          type: "success",
          message: "Producto actualizado correctamente",
        });
        // Recargar el producto para reflejar los cambios
        await loadProduct();
      } else {
        await createProduct(data as CreateProductDto);
        showToast({
          type: "success",
          message: "Producto creado correctamente",
        });
        setTimeout(() => {
          router.push("/dashboard/products");
        }, 1500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al guardar producto. Por favor, intenta nuevamente.";
      showToast({
        type: "error",
        message: errorMessage,
        durationMs: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    try {
      setUploadingImages(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo de archivo
        if (!allowedTypes.includes(file.type)) {
          showToast({
            type: "error",
            message: `El archivo ${file.name} no es válido. Solo se permiten PNG, JPG, JPEG o WEBP.`,
            durationMs: 5000,
          });
          continue;
        }

        // Validar tamaño
        if (file.size > maxSize) {
          showToast({
            type: "error",
            message: `El archivo ${file.name} es demasiado grande. Tamaño máximo: 10MB.`,
            durationMs: 5000,
          });
          continue;
        }

        // Subir imagen (pasar productId solo si existe, para productos nuevos será undefined)
        const startTime = Date.now();

        const result = await uploadProductImage(file, productId || undefined);
        if (result.success) {
          const url = await downloadImage(result.key)
          const uploadTime = Date.now() - startTime;

          // Agregar URL a la lista de imágenes si no existe
          if (!formData.images.includes(url)) {
            setFormData({
              ...formData,
              images: [...formData.images, url],
            });
          } else {
            console.log("⚠️ [ProductForm] La URL ya existe");
          }
        }
      }
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al subir imagen. Por favor, intenta nuevamente.",
        durationMs: 6000,
      });
    } finally {
      setUploadingImages(false);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
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
    <div className="max-w-3xl mx-auto">
      {ToastView}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {productId ? "Editar Producto" : "Nuevo Producto"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
              placeholder="Ej: Cama para Perros"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
              placeholder="Describe el producto..."
            />
          </div>

          {/* Precios y Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Base *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData({ ...formData, basePrice: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Tarjeta
                <span className="text-xs text-gray-400 ml-1">(opcional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.launchPrice}
                onChange={(e) =>
                  setFormData({ ...formData, launchPrice: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si se define, reemplaza al precio base para pagos con tarjeta
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Contado *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.cashPrice}
                onChange={(e) =>
                  setFormData({ ...formData, cashPrice: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se usa para contado / transferencia
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
              >
                <option value="ARS">ARS (Pesos Argentinos)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>
          </div>

          {/* Imágenes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imágenes
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Formatos permitidos: PNG, JPG, JPEG, WEBP. Tamaño máximo: 10MB
            </p>
            <div className="mb-2">
              <label
                htmlFor="image-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer transition-colors ${uploadingImages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {uploadingImages ? "Subiendo..." : "Seleccionar imágenes"}
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={(e) => handleImageUpload(e, productId as string)}
                disabled={uploadingImages}
                className="hidden"
              />
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full h-24 rounded-lg border border-gray-200 overflow-hidden">
                      <Image
                        src={url}
                        alt={`Imagen ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='12' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImagen%3C/text%3E%3C/svg%3E";
                        }}
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estado Activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-primary-turquoise border-gray-300 rounded focus:ring-primary-turquoise"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Producto activo
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push("/dashboard/products")}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-turquoise rounded-lg hover:bg-primary-turquoise/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Guardando..."
                : productId
                  ? "Actualizar"
                  : "Crear Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
