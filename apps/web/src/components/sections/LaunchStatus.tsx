"use client";

import { EventType } from "@pawgo/shared";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { BuyIntentModal } from "@/components/modals/BuyIntentModal";
import { useCTAConfig } from "@/contexts/ConfigContext";

export function LaunchStatus() {
  const [showModal, setShowModal] = useState(false);
  const cta = useCTAConfig();

  const handleNotifyClick = () => {
    trackEvent(EventType.BUY_INTENT_CLICKED, { source: "boton_quiero_enterarme" });
    setShowModal(true);
  };

  return (
    <>
      <section className="bg-primary-turquoise py-20 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Próximo lanzamiento en Argentina
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Estamos trabajando para traerte el mejor arnés para tu perro.
            Regístrate para ser el primero en enterarte cuando esté disponible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleNotifyClick}
              className="btn-secondary bg-white text-primary-turquoise hover:bg-background-light-gray border-white"
              aria-label="Registrarse para recibir notificaciones"
            >
              Quiero enterarme
            </button>
          </div>
        </div>
      </section>

      {showModal && (
        <BuyIntentModal
          onClose={() => setShowModal(false)}
          mode={cta?.modalType || "WAITLIST"}
        />
      )}
    </>
  );
}
