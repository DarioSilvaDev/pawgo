"use client";

import { useState, useEffect } from "react";
import { discountCodeAPI, adminInfluencerAPI } from "@/lib/discount-code";
import { CreateDiscountCodeDto } from "@pawgo/shared";
import { useToast } from "@/components/ui/useToast";

interface Influencer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

interface CreateDiscountCodeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateDiscountCodeForm({
  onSuccess,
  onCancel,
}: CreateDiscountCodeFormProps) {
  const { showToast, ToastView } = useToast();
  const initialFormData: CreateDiscountCodeDto = {
    influencerId: "",
    code: "",
    discountType: "percentage",
    discountValue: 0,
    minPurchase: undefined,
    maxUses: undefined,
    validUntil: undefined,
  };

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] =
    useState<CreateDiscountCodeDto>(initialFormData);

  useEffect(() => {
    loadInfluencers();
  }, []);

  const loadInfluencers = async () => {
    try {
      const data = await adminInfluencerAPI.getAll();
      setInfluencers(data.influencers || []);
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al cargar influencers",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.influencerId) {
        throw new Error("Debes seleccionar un influencer");
      }

      if (!formData.code || formData.code.length < 3) {
        throw new Error("El código debe tener al menos 3 caracteres");
      }

      if (formData.discountValue <= 0) {
        throw new Error("El valor del descuento debe ser mayor a 0");
      }

      if (
        formData.discountType === "percentage" &&
        formData.discountValue > 100
      ) {
        throw new Error("El porcentaje no puede ser mayor a 100%");
      }

      if (formData.minPurchase !== undefined && formData.minPurchase <= 0) {
        throw new Error("La compra mínima debe ser mayor a 0");
      }

      if (formData.maxUses !== undefined && formData.maxUses <= 0) {
        throw new Error("El límite de usos debe ser mayor a 0");
      }

      if (formData.validUntil) {
        // Codes expire at the end of the selected day (local). Validate using the start of the next day.
        const [y, m, d] = formData.validUntil.split("-").map(Number);
        const validUntilLocal = new Date(y, m - 1, d, 23, 59, 59, 0);
        if (validUntilLocal <= new Date()) {
          throw new Error("La fecha de expiración debe ser futura");
        }
      }

      await discountCodeAPI.create(formData);
      setFormData(initialFormData);
      showToast({ type: "success", message: "Código creado correctamente" });
      onSuccess?.();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al crear el código",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {ToastView}

      {/* Influencer Selection */}
      <div>
        <label
          htmlFor="influencerId"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Influencer <span className="text-red-500">*</span>
        </label>
        <select
          id="influencerId"
          value={formData.influencerId}
          onChange={(e) =>
            setFormData({ ...formData, influencerId: e.target.value })
          }
          required
          className="input-field"
        >
          <option value="">Selecciona un influencer</option>
          {influencers.map((inf) => (
            <option key={inf.id} value={inf.id}>
              {inf.name} ({inf.email})
            </option>
          ))}
        </select>
      </div>

      {/* Code */}
      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Código <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="code"
          value={formData.code}
          onChange={(e) =>
            setFormData({
              ...formData,
              code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
            })
          }
          required
          minLength={3}
          maxLength={50}
          className="input-field font-mono"
          placeholder="INFLUENCER10"
        />
        <p className="text-xs text-gray-500 mt-1">
          Solo letras mayúsculas, números, guiones y guiones bajos
        </p>
      </div>

      {/* Discount Type and Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="discountType"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tipo de Descuento <span className="text-red-500">*</span>
          </label>
          <select
            id="discountType"
            value={formData.discountType}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountType: e.target.value as "percentage" | "fixed",
              })
            }
            required
            className="input-field"
          >
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto Fijo (ARS)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="discountValue"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Valor <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="discountValue"
            value={formData.discountValue || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountValue: parseFloat(e.target.value) || 0,
              })
            }
            required
            min={0}
            max={formData.discountType === "percentage" ? 100 : undefined}
            step={formData.discountType === "percentage" ? 1 : 0.01}
            className="input-field"
            placeholder={formData.discountType === "percentage" ? "10" : "1000"}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.discountType === "percentage"
              ? "Porcentaje de descuento (0-100%)"
              : "Monto fijo en ARS"}
          </p>
        </div>
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="minPurchase"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Compra Mínima (ARS)
          </label>
          <input
            type="number"
            id="minPurchase"
            value={formData.minPurchase || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                minPurchase: e.target.value
                  ? parseFloat(e.target.value)
                  : undefined,
              })
            }
            min={0}
            step={0.01}
            className="input-field"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label
            htmlFor="maxUses"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Límite de Usos
          </label>
          <input
            type="number"
            id="maxUses"
            value={formData.maxUses || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxUses: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            min={1}
            className="input-field"
            placeholder="Opcional (ilimitado)"
          />
        </div>
      </div>

      {/* Valid Until */}
      <div>
        <label
          htmlFor="validUntil"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Válido Hasta
        </label>
        <input
          type="date"
          id="validUntil"
          value={
            formData.validUntil
              ? formData.validUntil
              : ""
          }
          onChange={(e) =>
            setFormData({
              ...formData,
                // Send date-only (YYYY-MM-DD). Backend will normalize to 00:00 UTC.
              validUntil: e.target.value ? e.target.value : undefined,
            })
          }
          className="input-field"
        />
        <p className="text-xs text-gray-500 mt-1">
          Dejar vacío para que no expire
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creando..." : "Crear Código"}
        </button>
      </div>
    </form>
  );
}

