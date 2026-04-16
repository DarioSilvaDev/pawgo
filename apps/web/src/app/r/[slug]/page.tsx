"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { resolvePartnerReferral } from "@/lib/partner";

export default function PartnerReferralPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = params?.slug;
    if (!slug) {
      setError("Referencia inválida");
      return;
    }

    const run = async () => {
      try {
        const referral = await resolvePartnerReferral(slug);
        const targetPath = referral.landingTarget === "home" ? "/" : "/checkout";
        router.replace(`${targetPath}?partner_ref=${encodeURIComponent(referral.slug)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos validar la referencia");
      }
    };

    run();
  }, [params?.slug, router]);

  return (
    <div className="min-h-screen bg-background-light-gray flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 text-center">
        {!error ? (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-primary-turquoise border-t-transparent animate-spin" />
            <h1 className="text-xl font-semibold text-text-black mb-2">Redirigiendo a tu compra</h1>
            <p className="text-text-dark-gray text-sm">Estamos validando tu referencia de partner.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-text-black mb-2">No pudimos validar la referencia</h1>
            <p className="text-red-600 text-sm mb-5">{error}</p>
            <button
              onClick={() => router.push("/checkout")}
              className="btn-primary w-full"
            >
              Ir al checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
