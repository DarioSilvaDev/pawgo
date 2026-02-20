"use client";

import { useState, useEffect, useCallback } from "react";
import { discountCodeAPI } from "@/lib/discount-code";
import { LeadDiscountConfig } from "@/shared";
import { useToast } from "@/components/ui/useToast";

export function LeadDiscountConfigForm() {
    const { showToast, ToastView } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<LeadDiscountConfig>({
        discountType: "percentage",
        discountValue: 15,
        validDays: 7,
    });

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const data = await discountCodeAPI.getLeadDiscountConfig();
            setConfig(data);
        } catch (err) {
            showToast({
                type: "error",
                message:
                    err instanceof Error ? err.message : "Error al cargar configuración",
                durationMs: 6000,
            });
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (config.discountValue <= 0) {
                throw new Error("El valor del descuento debe ser mayor a 0");
            }

            if (
                config.discountType === "percentage" &&
                config.discountValue > 100
            ) {
                throw new Error("El porcentaje no puede ser mayor a 100%");
            }

            if (config.validDays <= 0) {
                throw new Error("Los días de validez deben ser mayor a 0");
            }

            await discountCodeAPI.updateLeadDiscountConfig(config);
            showToast({
                type: "success",
                message: "Configuración guardada correctamente",
            });
        } catch (err) {
            showToast({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Error al guardar configuración",
                durationMs: 6000,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            {ToastView}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    Configuración de Descuento para Leads
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Configurá el descuento que recibirán los leads al ser notificados de disponibilidad del producto.
                    Los códigos se generan automáticamente con un uso único.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Discount Type */}
                    <div>
                        <label
                            htmlFor="leadDiscountType"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Tipo de Descuento
                        </label>
                        <select
                            id="leadDiscountType"
                            value={config.discountType}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    discountType: e.target.value as "percentage" | "fixed",
                                })
                            }
                            className="input-field"
                        >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo (ARS)</option>
                        </select>
                    </div>

                    {/* Discount Value */}
                    <div>
                        <label
                            htmlFor="leadDiscountValue"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Valor
                        </label>
                        <input
                            type="number"
                            id="leadDiscountValue"
                            value={config.discountValue}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    discountValue: parseFloat(e.target.value) || 0,
                                })
                            }
                            min={0}
                            max={config.discountType === "percentage" ? 100 : undefined}
                            step={config.discountType === "percentage" ? 1 : 0.01}
                            className="input-field"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {config.discountType === "percentage"
                                ? "Porcentaje (0-100%)"
                                : "Monto fijo en ARS"}
                        </p>
                    </div>

                    {/* Valid Days */}
                    <div>
                        <label
                            htmlFor="leadValidDays"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Días de Validez
                        </label>
                        <input
                            type="number"
                            id="leadValidDays"
                            value={config.validDays}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    validDays: parseInt(e.target.value) || 0,
                                })
                            }
                            min={1}
                            className="input-field"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Días desde la generación del código
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Guardando..." : "Guardar Configuración"}
                    </button>
                </div>
            </form>
        </div>
    );
}
