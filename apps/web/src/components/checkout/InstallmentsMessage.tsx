"use client";

import { formatPrice } from "@/lib/pricing";
import Image from "next/image";

interface InstallmentsMessageProps {
  totalAmount?: number;
  currency?: string;
  className?: string;
  variant?: "card" | "inline" | "compact";
}

const MAX_INSTALLMENTS = 3;

export function InstallmentsMessage({
  totalAmount,
  currency = "ARS",
  className = "",
  variant = "card",
}: InstallmentsMessageProps) {
  const installmentAmount =
    typeof totalAmount === "number" && totalAmount > 0
      ? totalAmount / MAX_INSTALLMENTS
      : null;

  const installmentCopy = installmentAmount
    ? `${MAX_INSTALLMENTS} cuotas de ${formatPrice(installmentAmount, currency)} sin interés`
    : null;

  if (variant === "inline") {
    return (
      <div className={className}>
        {installmentCopy && (
          <p className="text-[11px] text-emerald-700/90 leading-tight">
            {installmentCopy}
          </p>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-3 py-2 ${className}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
          Hasta {MAX_INSTALLMENTS} cuotas sin interés con Mercadopago
        </p>
        {installmentCopy && (
          <p className="text-sm font-semibold text-emerald-700 mt-0.5 leading-tight">
            {installmentCopy}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-emerald-200 bg-emerald-50 p-3 ${className}`}>
      <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
        Hasta 3 cuotas sin interés
      </p>
      {installmentCopy && (
        <p className="text-sm font-semibold text-emerald-700 mt-1">{installmentCopy}</p>
      )}
      <div className="mt-1 flex items-center gap-2">
        <Image
          src="/images/mercadopago-logo.svg"
          alt="Mercado Pago"
          width={74}
          height={24}
          className="h-4 w-auto"
        />
        <p className="text-xs text-emerald-700/90">Con Mercado Pago.</p>
      </div>
    </div>
  );
}
