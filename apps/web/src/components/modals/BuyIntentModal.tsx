"use client";

import { useState } from "react";
import Image from "next/image";
import { DogSize } from "@/shared";
import { submitLead, submitStockReservation } from "@/lib/api";
import { useToast } from "@/components/ui/useToast";
import { Product } from "@/lib/product";

interface BuyIntentModalProps {
  onClose: () => void;
  mode?: "BUY_INTENT" | "WAITLIST";
  product?: Product;
}

export function BuyIntentModal({ onClose, mode = "BUY_INTENT", product }: BuyIntentModalProps) {
  const { showToast, ToastView } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dogSize: "" as DogSize | "",
    selectedVariantIds: [] as string[],
    variantQuantities: {} as Record<string, number>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const handleVariantToggle = (variantId: string, checked: boolean) => {
    setFormData(prev => {
      const newSelected = checked
        ? [...prev.selectedVariantIds, variantId]
        : prev.selectedVariantIds.filter(id => id !== variantId);

      const newQuantities = { ...prev.variantQuantities };
      if (checked && !newQuantities[variantId]) {
        newQuantities[variantId] = 1;
      } else if (!checked) {
        delete newQuantities[variantId];
      }

      return {
        ...prev,
        selectedVariantIds: newSelected,
        variantQuantities: newQuantities
      };
    });
  };

  const handleQuantityChange = (variantId: string, delta: number) => {
    setFormData(prev => ({
      ...prev,
      variantQuantities: {
        ...prev.variantQuantities,
        [variantId]: Math.max(1, (prev.variantQuantities[variantId] || 1) + delta)
      }
    }));
  };

  const isFormValid = () => {
    const { name, email, selectedVariantIds } = formData;
    if (!name.trim() || !email.trim() || !email.includes("@")) return false;

    if (mode === "WAITLIST") {
      return selectedVariantIds.length > 0;
    }

    return !!formData.dogSize;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "WAITLIST" && formData.selectedVariantIds.length > 0) {
        await submitStockReservation({
          email: formData.email,
          name: formData.name || undefined,
          phoneNumber: formData.phone || undefined,
          items: formData.selectedVariantIds.map(id => ({
            variantId: id,
            quantity: formData.variantQuantities[id] || 1
          })),
        });
      } else {
        await submitLead({
          email: formData.email,
          name: formData.name || undefined,
          dogSize: formData.dogSize || undefined,
          incentive: mode === "BUY_INTENT" ? "20_off_launch" : "waitlist_stock",
        });
      }

      showToast({
        type: "success",
        message: "¡Perfecto! Te notificaremos cuando esté disponible.",
        durationMs: 4000,
      });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al enviar. Por favor, intenta nuevamente.",
        durationMs: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {ToastView}
      <div
        className="bg-white rounded-lg max-w-md w-full p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-title"
          className="text-2xl font-bold text-text-black mb-4"
        >
          {mode === "BUY_INTENT" ? "Sé de los primeros 🐾" : "¡Próximamente! 🐾"}
        </h2>
        <p className="text-text-dark-gray mb-6">
          {mode === "BUY_INTENT" ? (
            <>
              PawGo llega muy pronto. Registrate ahora y asegurá tu{" "}
              <strong>15% OFF de lanzamiento</strong>. Solo para las primeras 50 unidades.
              🔥 ¡No te quedes afuera!
            </>
          ) : (
            <>
              Dejanos tus datos y te avisaremos en cuanto tengamos <strong>stock disponible</strong>.
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-name"
              className="block text-sm font-medium text-text-dark-gray mb-2"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="modal-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="input-field"
              placeholder="Tu nombre"
              aria-required="true"
            />
          </div>

          <div>
            <label
              htmlFor="modal-email"
              className="block text-sm font-medium text-text-dark-gray mb-2"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="modal-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="input-field"
              placeholder="tu@email.com"
              aria-required="true"
            />
          </div>

          <div>
            <label
              htmlFor="modal-phone"
              className="block text-sm font-medium text-text-dark-gray mb-2"
            >
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              id="modal-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              placeholder="Ej: 1122334455"
            />
          </div>

          {mode === "WAITLIST" && product && product.variants && product.variants.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-text-dark-gray mb-3">
                Seleccioná los talles que te interesan <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {product.variants
                  .filter((variant) => mode !== "WAITLIST" || variant.stock === 0)
                  .map((variant) => (
                    <div
                      key={variant.id}
                      className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${formData.selectedVariantIds.includes(variant.id)
                          ? "border-primary-turquoise bg-primary-turquoise/5"
                          : "border-gray-100"
                        }
                    `}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.selectedVariantIds.includes(variant.id)}
                          onChange={(e) => handleVariantToggle(variant.id, e.target.checked)}
                        />
                        <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${formData.selectedVariantIds.includes(variant.id)
                            ? "border-primary-turquoise bg-primary-turquoise"
                            : "border-gray-300"
                          }
                      `}>
                          {formData.selectedVariantIds.includes(variant.id) && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-text-black">{variant.name}</span>
                          {variant.size && <span className="text-xs text-text-dark-gray">{variant.size}</span>}
                        </div>
                      </label>

                      {formData.selectedVariantIds.includes(variant.id) && (
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1 ml-4 shadow-sm animate-in fade-in zoom-in duration-200">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(variant.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-text-black disabled:opacity-30"
                            disabled={formData.variantQuantities[variant.id] <= 1}
                          >
                            -
                          </button>
                          <span className="text-sm font-bold w-6 text-center select-none">
                            {formData.variantQuantities[variant.id] || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(variant.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-text-black"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="modal-dog-size"
                  className="block text-sm font-medium text-text-dark-gray"
                >
                  Tamaño de tu perro <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-primary-turquoise hover:underline"
                  aria-label="Ver guía de tallas"
                >
                  Ver guía de tallas
                </button>
              </div>
              <p className="text-xs text-text-dark-gray mb-2">
                Revisa las medidas antes de seleccionar
              </p>
              <select
                id="modal-dog-size"
                value={formData.dogSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dogSize: e.target.value as DogSize,
                  })
                }
                required
                className="input-field"
                aria-required="true"
              >
                <option value="">Selecciona un tamaño</option>
                <option value={DogSize.EXTRA_SMALL}>Extra Pequeño</option>
                <option value={DogSize.SMALL}>Pequeño</option>
                <option value={DogSize.MEDIUM}>Mediano</option>
                <option value={DogSize.LARGE}>Grande</option>
                <option value={DogSize.EXTRA_LARGE}>Extra Grande</option>
              </select>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              aria-label="Cerrar modal"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar formulario de compra"
            >
              {isSubmitting ? "Enviando..." : "Avisame"}
            </button>
          </div>
        </form>

        {/* Size Guide Modal */}
        {showSizeGuide && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowSizeGuide(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  id="size-guide-title"
                  className="text-2xl font-bold text-text-black"
                >
                  Guía de Tallas
                </h3>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="text-text-dark-gray hover:text-text-black text-2xl font-bold"
                  aria-label="Cerrar guía de tallas"
                >
                  ×
                </button>
              </div>
              <p className="text-text-dark-gray mb-6">
                Revisa las medidas para elegir el tamaño correcto para tu perro
              </p>
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-50">
                <Image
                  src="/images/size_ok.jpg"
                  alt="Guía de tallas PawGo - Medidas para perros pequeños, medianos, grandes y extra grandes"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 90vw"
                />
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="btn-primary"
                  aria-label="Cerrar guía de tallas"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
