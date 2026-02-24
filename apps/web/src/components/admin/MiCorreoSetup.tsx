"use client";

import { useState, useEffect } from "react";
import {
    getProvinces,
    registerMiCorreoCustomer,
    validateMiCorreoUser,
    type Province,
    type RegisterCustomerDto,
    type MiCorreoCustomerResponse,
} from "@/lib/micorreo";

// Provinces are loaded from /api/geo/provincias (cached 24h on the backend)
// and mapped to MiCorreo's single-letter province codes via INDEC_TO_MICORREO.

type TabId = "register" | "validate";

interface ResultState {
    success: boolean;
    data?: MiCorreoCustomerResponse;
    error?: string;
}

// ─── Shared field styles ──────────────────────────────────────────────────────
const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-turquoise focus:border-transparent transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SuccessBadge({ customerId }: { customerId: string }) {
    return (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <p className="text-sm font-semibold text-green-800">Operación exitosa</p>
                <p className="text-xs text-green-700 mt-0.5">
                    Customer ID: <span className="font-mono font-bold">{customerId}</span>
                </p>
                <p className="text-xs text-green-600 mt-1">
                    El cliente quedó registrado en la base de datos local y listo para cotizar envíos.
                </p>
            </div>
        </div>
    );
}

function ErrorBadge({ message }: { message: string }) {
    return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <div>
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-xs text-red-700 mt-0.5">{message}</p>
            </div>
        </div>
    );
}

// ─── Register tab ─────────────────────────────────────────────────────────────

function RegisterTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState | null>(null);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [provincesLoading, setProvincesLoading] = useState(true);

    // Load provinces from backend (GeoService has 24h cache)
    useEffect(() => {
        getProvinces()
            .then(setProvinces)
            .finally(() => setProvincesLoading(false));
    }, []);

    const [form, setForm] = useState<RegisterCustomerDto>({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        documentType: "DNI",
        documentId: "",
        phone: "",
        cellPhone: "",
        address: {
            streetName: "",
            streetNumber: "",
            floor: "",
            apartment: "",
            locality: "",
            city: "",
            provinceCode: "B",
            postalCode: "",
        },
    });

    const set = (field: keyof Omit<RegisterCustomerDto, "address">, value: string) =>
        setForm((f) => ({ ...f, [field]: value }));

    const setAddr = (field: keyof RegisterCustomerDto["address"], value: string) =>
        setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const data = await registerMiCorreoCustomer(form);
            setResult({ success: true, data });
        } catch (err) {
            setResult({ success: false, error: err instanceof Error ? err.message : "Error desconocido" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal data */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Datos personales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Nombre *</label>
                        <input className={inputClass} required value={form.firstName}
                            onChange={(e) => set("firstName", e.target.value)} placeholder="Juan" />
                    </div>
                    <div>
                        <label className={labelClass}>Apellido *</label>
                        <input className={inputClass} required value={form.lastName}
                            onChange={(e) => set("lastName", e.target.value)} placeholder="García" />
                    </div>
                    <div>
                        <label className={labelClass}>Email *</label>
                        <input className={inputClass} type="email" required value={form.email}
                            onChange={(e) => set("email", e.target.value)} placeholder="correo@empresa.com" />
                    </div>
                    <div>
                        <label className={labelClass}>Contraseña *</label>
                        <input className={inputClass} type="password" required minLength={6} value={form.password}
                            onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div>
                        <label className={labelClass}>Tipo de documento *</label>
                        <select className={inputClass} value={form.documentType}
                            onChange={(e) => set("documentType", e.target.value as "DNI" | "CUIT")}>
                            <option value="DNI">DNI</option>
                            <option value="CUIT">CUIT</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Número de documento *</label>
                        <input className={inputClass} required value={form.documentId}
                            onChange={(e) => set("documentId", e.target.value)} placeholder="33722435" />
                    </div>
                    <div>
                        <label className={labelClass}>Teléfono fijo</label>
                        <input className={inputClass} value={form.phone}
                            onChange={(e) => set("phone", e.target.value)} placeholder="01149999999" />
                    </div>
                    <div>
                        <label className={labelClass}>Celular</label>
                        <input className={inputClass} value={form.cellPhone}
                            onChange={(e) => set("cellPhone", e.target.value)} placeholder="1155554444" />
                    </div>
                </div>
            </div>

            {/* Address */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Dirección
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className={labelClass}>Calle *</label>
                        <input className={inputClass} required value={form.address.streetName}
                            onChange={(e) => setAddr("streetName", e.target.value)} placeholder="Av. Corrientes" />
                    </div>
                    <div>
                        <label className={labelClass}>Número *</label>
                        <input className={inputClass} required value={form.address.streetNumber}
                            onChange={(e) => setAddr("streetNumber", e.target.value)} placeholder="1234" />
                    </div>
                    <div>
                        <label className={labelClass}>Piso</label>
                        <input className={inputClass} value={form.address.floor}
                            onChange={(e) => setAddr("floor", e.target.value)} placeholder="2" />
                    </div>
                    <div>
                        <label className={labelClass}>Departamento</label>
                        <input className={inputClass} value={form.address.apartment}
                            onChange={(e) => setAddr("apartment", e.target.value)} placeholder="A" />
                    </div>
                    <div>
                        <label className={labelClass}>Localidad</label>
                        <input className={inputClass} value={form.address.locality}
                            onChange={(e) => setAddr("locality", e.target.value)} placeholder="Palermo" />
                    </div>
                    <div>
                        <label className={labelClass}>Ciudad *</label>
                        <input className={inputClass} required value={form.address.city}
                            onChange={(e) => setAddr("city", e.target.value)} placeholder="Buenos Aires" />
                    </div>

                    {/* Provincia — cargada desde /api/geo/provincias con caché de 24h */}
                    <div>
                        <label className={labelClass}>
                            Provincia *
                            {provincesLoading && (
                                <span className="ml-2 text-xs font-normal text-gray-400">(cargando...)</span>
                            )}
                        </label>
                        <select
                            className={inputClass}
                            value={form.address.provinceCode}
                            onChange={(e) => setAddr("provinceCode", e.target.value)}
                            disabled={provincesLoading}
                        >
                            {provincesLoading ? (
                                <option value="">Cargando provincias...</option>
                            ) : (
                                provinces.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.nombre}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Código Postal *</label>
                        <input className={inputClass} required value={form.address.postalCode}
                            onChange={(e) => setAddr("postalCode", e.target.value)} placeholder="1414" />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary-turquoise text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Registrando...
                    </>
                ) : (
                    "Registrar cliente"
                )}
            </button>

            {result?.success && result.data && <SuccessBadge customerId={result.data.customerId} />}
            {result && !result.success && result.error && <ErrorBadge message={result.error} />}
        </form>
    );
}

// ─── Validate tab ─────────────────────────────────────────────────────────────

function ValidateTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultState | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const data = await validateMiCorreoUser({ email, password });
            setResult({ success: true, data });
        } catch (err) {
            setResult({ success: false, error: err instanceof Error ? err.message : "Error desconocido" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            <p className="text-sm text-gray-500">
                Validá las credenciales de un cliente existente en MiCorreo para obtener su{" "}
                <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">customerId</span>{" "}
                y guardarlo en la base de datos local.
            </p>

            <div>
                <label className={labelClass}>Email *</label>
                <input
                    className={inputClass}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                />
            </div>

            <div>
                <label className={labelClass}>Contraseña *</label>
                <input
                    className={inputClass}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña de MiCorreo"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary-turquoise text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Validando...
                    </>
                ) : (
                    "Validar credenciales"
                )}
            </button>

            {result?.success && result.data && <SuccessBadge customerId={result.data.customerId} />}
            {result && !result.success && result.error && <ErrorBadge message={result.error} />}
        </form>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MiCorreoSetup() {
    const [activeTab, setActiveTab] = useState<TabId>("validate");

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        {
            id: "validate",
            label: "Validar usuario existente",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: "register",
            label: "Registrar nuevo cliente",
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Configuración MiCorreo</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Gestión del cliente de Correo Argentino para calcular costos de envío
                    </p>
                </div>
            </div>

            {/* Info banner */}
            <div className="mx-6 mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-800">
                    <strong>Se requiere un cliente activo en la tabla MiCorreoCustomer</strong> para que el sistema
                    pueda cotizar envíos automáticamente. Si ya tenés una cuenta en MiCorreo, usá{" "}
                    <em>Validar usuario existente</em>. Si no, registrá uno nuevo.
                </p>
            </div>

            {/* Tabs */}
            <div className="px-6 mt-5">
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="p-6 pt-5">
                {activeTab === "validate" ? <ValidateTab /> : <RegisterTab />}
            </div>
        </div>
    );
}
