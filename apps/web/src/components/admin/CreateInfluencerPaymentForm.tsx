"use client";

import { useState, useEffect, useCallback } from "react";
import { CreateInfluencerPaymentDto } from "@pawgo/shared";
import { createInfluencerPayment, getPendingCommissions } from "@/lib/influencer-payment";
import { getAllInfluencers } from "@/lib/influencer";
import { useToast } from "@/components/ui/useToast";

interface CreateInfluencerPaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface Influencer {
  id: string;
  name: string;
  email: string;
}

interface Commission {
  id: string;
  commissionAmount: number;
  orderId: string;
  discountCode: {
    code: string;
  };
}

export function CreateInfluencerPaymentForm({
  onSuccess,
  onCancel,
}: CreateInfluencerPaymentFormProps) {
  const { showToast, ToastView } = useToast();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("");
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "mercadopago">("transfer");
  const [loading, setLoading] = useState(false);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const loadInfluencers = useCallback(async () => {
    try {
      const data = await getAllInfluencers();
      if (Array.isArray(data)) {
        setInfluencers(data);
      } else {
        console.error("Unexpected data format:", data);
        showToast({
          type: "error",
          message: "Error al cargar influencers: formato de datos inválido",
          durationMs: 6000,
        });
      }
    } catch (error) {
      console.error("Error loading influencers:", error);
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? `Error al cargar influencers: ${error.message}`
            : "Error al cargar influencers",
        durationMs: 6000,
      });
    }
  }, [showToast]);

  const loadCommissions = useCallback(async () => {
    try {
      setLoadingCommissions(true);
      const data = await getPendingCommissions(selectedInfluencer);
      setCommissions(data);
    } catch (error) {
      console.error("Error loading commissions:", error);
      showToast({ type: "error", message: "Error al cargar comisiones", durationMs: 6000 });
    } finally {
      setLoadingCommissions(false);
    }
  }, [selectedInfluencer, showToast]);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  useEffect(() => {
    if (selectedInfluencer) {
      loadCommissions();
    } else {
      setCommissions([]);
      setSelectedCommissions([]);
    }
  }, [selectedInfluencer, loadCommissions]);

  const handleCommissionToggle = (commissionId: string) => {
    setSelectedCommissions((prev) =>
      prev.includes(commissionId)
        ? prev.filter((id) => id !== commissionId)
        : [...prev, commissionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInfluencer) {
      showToast({ type: "error", message: "Debes seleccionar un influencer" });
      return;
    }

    if (selectedCommissions.length === 0) {
      showToast({ type: "error", message: "Debes seleccionar al menos una comisión" });
      return;
    }

    try {
      setLoading(true);
      const data: CreateInfluencerPaymentDto = {
        influencerId: selectedInfluencer,
        commissionIds: selectedCommissions,
        paymentMethod,
      };

      await createInfluencerPayment(data);
      showToast({ type: "success", message: "Solicitud de pago creada correctamente" });
      onSuccess();
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Error al crear el pago",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = commissions
    .filter((c) => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {ToastView}
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Crear Solicitud de Pago
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Influencer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Influencer
          </label>
          <select
            value={selectedInfluencer}
            onChange={(e) => setSelectedInfluencer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise"
            required
          >
            <option value="">Selecciona un influencer</option>
            {influencers.map((influencer) => (
              <option key={influencer.id} value={influencer.id}>
                {influencer.name} ({influencer.email})
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Método de Pago
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="transfer"
                checked={paymentMethod === "transfer"}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "transfer" | "mercadopago")
                }
                className="mr-2"
              />
              Transferencia Bancaria
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="mercadopago"
                checked={paymentMethod === "mercadopago"}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "transfer" | "mercadopago")
                }
                className="mr-2"
              />
              MercadoPago
            </label>
          </div>
        </div>

        {/* Commissions Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comisiones Pendientes
          </label>
          {loadingCommissions ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise mx-auto"></div>
            </div>
          ) : commissions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              {selectedInfluencer
                ? "No hay comisiones pendientes para este influencer"
                : "Selecciona un influencer para ver sus comisiones"}
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {commissions.map((commission) => (
                <label
                  key={commission.id}
                  className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCommissions.includes(commission.id)}
                    onChange={() => handleCommissionToggle(commission.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        Código: {commission.discountCode.code}
                      </span>
                      <span className="text-sm font-semibold text-primary-turquoise">
                        ${Number(commission.commissionAmount).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Orden: {commission.orderId}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {selectedCommissions.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Total a Pagar:
              </span>
              <span className="text-xl font-bold text-primary-turquoise">
                ${totalAmount.toLocaleString()} ARS
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || selectedCommissions.length === 0}
            className="px-4 py-2 bg-primary-turquoise text-white rounded-lg hover:bg-primary-turquoise/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando..." : "Crear Pago"}
          </button>
        </div>
      </form>
    </div>
  );
}

