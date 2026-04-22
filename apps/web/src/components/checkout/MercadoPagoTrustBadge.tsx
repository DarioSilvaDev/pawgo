import Image from "next/image";

interface MercadoPagoTrustBadgeProps {
  variant?: "default" | "compact" | "inline" | "feature";
  className?: string;
}

export function MercadoPagoTrustBadge({
  variant = "default",
  className = "",
}: MercadoPagoTrustBadgeProps) {
  if (variant === "inline") {
    return (
      <div className={`inline-flex items-center gap-2 text-[11px] text-sky-700 ${className}`}>
        <Image
          src="/images/mercadopago-logo.svg"
          alt="Mercado Pago"
          width={66}
          height={22}
          className="h-4 w-auto"
        />
        <span className="font-medium">Pago seguro con Mercado Pago</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 ${className}`}>
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/mercadopago-logo.svg"
            alt="Mercado Pago"
            width={80}
            height={26}
            className="h-5 w-auto"
          />
          <p className="text-xs font-semibold text-sky-800">Pago seguro y protegido</p>
        </div>
      </div>
    );
  }

  if (variant === "feature") {
    return (
      <div className={`flex items-center ${className}`}>
        <p className="whitespace-nowrap text-[13px] font-semibold leading-none text-sky-800">
          Pago seguro y protegido
        </p>
        <Image
          src="/images/mercadopago-logo.svg"
          alt="Mercado Pago"
          width={106}
          height={34}
          className="h-8 w-auto flex-shrink-0"
        />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-sky-200 bg-sky-50 p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <Image
          src="/images/mercadopago-logo.svg"
          alt="Mercado Pago"
          width={104}
          height={33}
          className="h-8 w-auto mt-0.5"
        />
        <div>
          <p className="text-sm font-semibold text-sky-900">Pago protegido con Mercado Pago</p>
          <p className="text-xs text-sky-800 mt-0.5">
            Tus datos se ingresan en Mercado Pago, no en PawGo.
          </p>
        </div>
      </div>
    </div>
  );
}
