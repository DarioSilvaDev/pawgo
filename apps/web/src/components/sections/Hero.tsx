"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { EventType } from "@/shared";
import { BuyIntentModal } from "@/components/modals/BuyIntentModal";
import { useCTAConfig } from "@/contexts/ConfigContext";

export function Hero() {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const cta = useCTAConfig();

  const handleCTAClick = () => {
    trackEvent(EventType.BUY_INTENT_CLICKED, { source: "boton_quiero_uno" });

    // Fallback if config is not yet loaded or corrupt
    if (!cta) {
      router.push("/checkout");
      return;
    }

    switch (cta.action) {
      case "SHOW_MODAL":
        // cta.modalType could be used here to select different modals if they existed
        setShowModal(true);
        break;

      case "REDIRECT":
        router.push(cta.url ?? "/checkout");
        break;

      default:
        console.warn("Unknown CTA action", cta);
        router.push("/checkout");
    }
  };

  const handleLearnMoreClick = () => {
    trackEvent(EventType.CTA_CLICK, {
      location: "hero",
      action: "boton_saber_mas",
    });
    // Scroll to product section
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative bg-gradient-to-b from-primary-turquoise/5 to-white py-10 md:py-32">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Logo */}
        <div className="w-full flex justify-center mb-2 md:mb-12">
          <div className="relative w-48 h-16 sm:w-56 sm:h-20 md:w-64 md:h-24">
            <Image
              src="/images/PawGo.svg"
              alt="PawGo Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Logo */}
          <div className="w-full md:w-1/3 flex justify-center">
            <div className="relative w-[340px] h-[340px] rounded-lg shadow-lg overflow-hidden">
              <Image
                src="/images/ejemplo-removebg-preview.png"
                alt="PawGo Producto"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Content */}
          <div className="w-full md:w-2/3 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text-black mb-6">
              El arnés que vos y tu compañero de cuatro patas{" "}
              <span className="text-primary-turquoise">necesitan</span> 🐕‍🦺
            </h1>

            <p className="text-lg md:text-2xl text-text-dark-gray mb-8 leading-relaxed">
              Arnés innovador con correa retráctil integrada. Diseñado para la
              comodidad de tu mascota y tu tranquilidad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={handleCTAClick}
                className="btn-primary text-lg px-8 py-4"
                aria-label="Expresar intención de compra"
              >
                Quiero uno!
              </button>
              <button
                onClick={handleLearnMoreClick}
                className="btn-secondary text-lg px-8 py-4"
                aria-label="Saber más sobre el producto"
              >
                Saber más
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <BuyIntentModal
          onClose={() => setShowModal(false)}
          mode={cta?.modalType}
        />
      )}
    </section>
  );
}
