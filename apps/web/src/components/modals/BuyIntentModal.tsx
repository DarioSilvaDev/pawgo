"use client";

import { useState } from "react";
import Image from "next/image";
import { DogSize, EventType } from "@pawgo/shared";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/api";
import { useToast } from "@/components/ui/useToast";

interface BuyIntentModalProps {
  onClose: () => void;
}

export function BuyIntentModal({ onClose }: BuyIntentModalProps) {
  const { showToast, ToastView } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dogSize: "" as DogSize | "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitLead({
        email: formData.email,
        name: formData.name || undefined,
        dogSize: formData.dogSize || undefined,
      });

      // Registrar evento de lead enviado (el click en "Quiero uno" ya se registró en Hero.tsx)
      trackEvent(EventType.LEAD_SUBMITTED, {
        source: "modal_intencion_compra",
        hasName: !!formData.name,
        hasDogSize: !!formData.dogSize,
      });

      showToast({
        type: "success",
        message: "¡Perfecto! Te notificaremos cuando esté disponible.",
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
          ¡Próximamente!
        </h2>
        <p className="text-text-dark-gray mb-6">
          PawGo estará disponible muy pronto. Dejanos tu email y te avisaremos
          en cuanto esté disponible en Argentina.
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
              <option value={DogSize.SMALL}>Pequeño</option>
              <option value={DogSize.MEDIUM}>Mediano</option>
              <option value={DogSize.LARGE}>Grande</option>
              <option value={DogSize.EXTRA_LARGE}>Extra Grande</option>
            </select>
          </div>

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
              disabled={isSubmitting}
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
                  src="/images/medidas.png"
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
