"use client";

import { useState } from "react";
import { EventType } from "@pawgo/shared";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/api";
import { useToast } from "@/components/ui/useToast";

export function LeadForm() {
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
        source: "formulario_principal",
      });

      showToast({
        type: "success",
        message: "¡Gracias! Te notificaremos cuando PawGo esté disponible.",
      });
      setEmail("");
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Error al enviar el formulario. Por favor, intenta nuevamente.",
        durationMs: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="lead-form" className="bg-background-white py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-background-light-gray rounded-lg shadow-lg p-8 md:p-12">
          {ToastView}
          <h2 className="text-3xl md:text-4xl font-bold text-text-black text-center mb-4">
            Sé el primero en enterarte
          </h2>
          <p className="text-lg text-text-dark-gray text-center mb-8">
            Regístrate y te notificaremos cuando PawGo esté disponible en
            Argentina.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-dark-gray mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="tu@email.com"
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar formulario de registro"
            >
              {isSubmitting ? "Enviando..." : "Avisame cuando esté disponible"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
