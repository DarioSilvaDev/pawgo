"use client";

import { useState, useEffect, useCallback } from "react";
import { CTAConfig, CTAAction } from "@pawgo/shared";
import { getAdminCTAConfig, updateCTAConfig } from "@/lib/config";
import { useToast } from "@/components/ui/useToast";

export function CTAConfigForm() {
    const [config, setConfig] = useState<CTAConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast, ToastView } = useToast();

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminCTAConfig();
            setConfig(data);
        } catch (error) {
            console.error("Error al cargar config:", error);
            showToast({
                type: "error",
                message: "Error al cargar la configuración del CTA",
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
        if (!config) return;

        try {
            setSaving(true);

            // Filtrar solo los campos necesarios según la acción para evitar errores de validación (Zod discriminatedUnion)
            const payload: any = { action: config.action };
            if (config.action === 'REDIRECT') {
                payload.url = config.url || "/checkout";
            } else if (config.action === 'SHOW_MODAL') {
                payload.modalType = config.modalType || "BUY_INTENT";
            }

            await updateCTAConfig(payload);
            showToast({
                type: "success",
                message: "Configuración del CTA actualizada correctamente",
            });
            // Refrescar configuración pública para que se note en el sitio
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("config:updated"));
            }
        } catch (error) {
            showToast({
                type: "error",
                message: error instanceof Error ? error.message : "Error al actualizar",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg border border-red-100">
                Hubo un error al cargar la configuración.
                <button onClick={loadConfig} className="ml-4 underline font-medium">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {ToastView}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Configuración del Call to Action (CTA)</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Controla globalmente qué sucede cuando los usuarios hacen clic en el botón principal de compra.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Acción Principal
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`
                                flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                ${config.action === 'REDIRECT'
                                    ? 'border-primary-turquoise bg-primary-turquoise/5'
                                    : 'border-gray-100 hover:border-gray-200'}
                            `}>
                                <input
                                    type="radio"
                                    name="ctaAction"
                                    value="REDIRECT"
                                    checked={config.action === 'REDIRECT'}
                                    onChange={() => setConfig({
                                        ...config,
                                        action: 'REDIRECT',
                                        url: config.url || "/checkout"
                                    })}
                                    className="sr-only"
                                />
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.action === 'REDIRECT' ? 'border-primary-turquoise' : 'border-gray-300'}`}>
                                        {config.action === 'REDIRECT' && <div className="w-2.5 h-2.5 rounded-full bg-primary-turquoise" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Redirección</p>
                                        <p className="text-xs text-gray-500">Envía al usuario al checkout o una URL externa.</p>
                                    </div>
                                </div>
                            </label>

                            <label className={`
                                flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                ${config.action === 'SHOW_MODAL'
                                    ? 'border-primary-turquoise bg-primary-turquoise/5'
                                    : 'border-gray-100 hover:border-gray-200'}
                            `}>
                                <input
                                    type="radio"
                                    name="ctaAction"
                                    value="SHOW_MODAL"
                                    checked={config.action === 'SHOW_MODAL'}
                                    onChange={() => setConfig({
                                        ...config,
                                        action: 'SHOW_MODAL',
                                        modalType: config.modalType || "BUY_INTENT"
                                    })}
                                    className="sr-only"
                                />
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.action === 'SHOW_MODAL' ? 'border-primary-turquoise' : 'border-gray-300'}`}>
                                        {config.action === 'SHOW_MODAL' && <div className="w-2.5 h-2.5 rounded-full bg-primary-turquoise" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Mostrar Modal</p>
                                        <p className="text-xs text-gray-500">Muestra un formulario de suscripción o lista de espera.</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {config.action === "REDIRECT" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label htmlFor="ctaUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                URL de Destino <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="ctaUrl"
                                type="text"
                                value={config.url || ""}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                placeholder="/checkout"
                                required
                                className="input-field"
                            />
                            <p className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                                <span className="inline-block p-1 bg-blue-50 text-blue-600 rounded shrink-0">💡</span>
                                Usa &quot;/checkout&quot; para el flujo interno o una URL completa (https://...) para links externos.
                            </p>
                        </div>
                    )}

                    {config.action === "SHOW_MODAL" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label htmlFor="modalType" className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Formulario <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="modalType"
                                value={config.modalType || "BUY_INTENT"}
                                onChange={(e) => setConfig({ ...config, modalType: e.target.value as any })}
                                className="input-field"
                            >
                                <option value="BUY_INTENT">Lanzamiento (20% descuento)</option>
                                <option value="WAITLIST">Lista de Espera (Standard)</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                                <span className="inline-block p-1 bg-blue-50 text-blue-600 rounded shrink-0">💡</span>
                                El formulario de &quot;Lanzamiento&quot; está optimizado para capturar leads ofreciendo beneficios.
                            </p>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Cambios auditados y cacheables
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary min-w-[150px] shadow-lg shadow-primary-turquoise/20"
                    >
                        {saving ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Guardando...
                            </div>
                        ) : "Guardar Cambios"}
                    </button>
                </div>
            </form>
        </div>
    );
}
