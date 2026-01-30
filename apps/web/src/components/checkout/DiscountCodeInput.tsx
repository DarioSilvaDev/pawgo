"use client";

import { useState } from "react";
import { validateDiscountCode } from "@/lib/discount-code";
import { useToast } from "@/components/ui/useToast";

interface DiscountCodeInputProps {
  subtotal: number;
  onCodeValidated: (discountAmount: number, code?: string) => void;
  onCodeRemoved: () => void;
  appliedDiscount?: number;
  appliedCode?: string;
}

export function DiscountCodeInput({
  subtotal,
  onCodeValidated,
  onCodeRemoved,
  appliedDiscount = 0,
  appliedCode,
}: DiscountCodeInputProps) {
  const { showToast, ToastView } = useToast();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) {
      showToast({ type: "error", message: "Por favor ingresa un código" });
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateDiscountCode(
        code.trim().toUpperCase(),
        subtotal
      );

      if (result.valid) {
        onCodeValidated(result.discountAmount, code.trim().toUpperCase());
        setCode("");
        showToast({ type: "success", message: "Código aplicado correctamente" });
      } else {
        showToast({
          type: "error",
          message: result.error || "Código inválido",
          durationMs: 6000,
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al validar el código. Intenta nuevamente.",
        durationMs: 6000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    onCodeRemoved();
    showToast({ type: "info", message: "Código removido" });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
      {ToastView}
      <h3 className="text-lg md:text-xl font-semibold text-text-black mb-4">
        Código de Descuento
      </h3>

      {appliedCode && appliedDiscount > 0 ? (
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  Código aplicado:{" "}
                  <span className="font-bold">{appliedCode}</span>
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Descuento: ${appliedDiscount.toLocaleString("es-AR")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 transition-colors"
                aria-label="Remover código"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleValidate();
                }
              }}
              placeholder="Ingresa el código de descuento"
              className="input-field flex-1"
              disabled={isValidating}
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !code.trim()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isValidating ? "Validando..." : "Aplicar"}
            </button>
          </div>

          <p className="text-xs text-text-dark-gray">
            ¿Tienes un código de descuento? Ingrésalo aquí para aplicar el
            descuento.
          </p>
        </div>
      )}
    </div>
  );
}
