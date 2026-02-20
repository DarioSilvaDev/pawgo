"use client";

import { useState } from "react";
import { EventType } from "@/shared";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/api";
import { useToast } from "@/components/ui/useToast";

interface LeadFormModalProps {
  onClose: () => void;
}

export function LeadFormModal({ onClose }: LeadFormModalProps) {
  const { showToast, ToastView } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitLead({
        email,
        incentive: "none",
      });

      trackEvent(EventType.LEAD_SUBMITTED, {
        source: "modal_avisame",
        incentive: "none",
      });

      showToast({
        type: "success",
        message: "¡Gracias! Te notificaremos cuando PawGo esté disponible.",
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
          Sé el primero en enterarte
        </h2>
        <p className="text-text-dark-gray mb-6">
          Regístrate y te notificaremos cuando PawGo esté disponible en
          Argentina.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="tu@email.com"
              aria-required="true"
            />
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
              aria-label="Enviar email para notificación"
            >
              {isSubmitting ? "Enviando..." : "Avisame"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
