"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAPI } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface Review {
    id: string;
    petName: string;
    rating: number;
    comment: string;
    imageUrl: string | null;
    email: string;
    orderId: string | null;
    status: "pending" | "approved" | "rejected";
    isApproved: boolean;
    isFeatured: boolean;
    rejectedReason: string | null;
    purchaseVerified: boolean;
    photoConsent: boolean;
    submittedFrom: string | null;
    createdAt: string;
    approvedAt: string | null;
    rejectedAt: string | null;
}

interface ReviewEmailAccess {
    id: string;
    email: string;
    remainingReviews: number;
    usedReviews: number;
    isActive: boolean;
    notes: string | null;
    updatedAt: string;
    lastUsedAt: string | null;
}

function StarDisplay({ value }: { value: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= value ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
            ))}
        </div>
    );
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending: { label: "⏳ Pendiente", className: "bg-amber-100 text-amber-700" },
    approved: { label: "✅ Aprobada", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "❌ Rechazada", className: "bg-red-100 text-red-700" },
};

export default function AdminReviewsPage() {
    const router = useRouter();
    useAuth(); // ensures we are within AuthProvider

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
    const [total, setTotal] = useState(0);
    const [emailAccessRows, setEmailAccessRows] = useState<ReviewEmailAccess[]>([]);
    const [loadingEmailAccess, setLoadingEmailAccess] = useState(true);
    const [savingEmailAccess, setSavingEmailAccess] = useState(false);
    const [quotaEmail, setQuotaEmail] = useState("");
    const [quotaValue, setQuotaValue] = useState("1");
    const [quotaNotes, setQuotaNotes] = useState("");

    // Moderation modal state
    const [moderatingId, setModeratingId] = useState<string | null>(null);
    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [rejectReason, setRejectReason] = useState("");
    const [moderating, setModerating] = useState(false);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "50" });
            if (statusFilter) params.set("status", statusFilter);

            const res = await fetchAPI(`/admin/reviews?${params}`);
            if (res.status === 401 || res.status === 403) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            setReviews(data.data ?? []);
            setTotal(data.pagination?.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, router]);

    const fetchEmailAccess = useCallback(async () => {
        setLoadingEmailAccess(true);
        try {
            const res = await fetchAPI("/admin/reviews/email-access?limit=50");
            if (res.status === 401 || res.status === 403) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            setEmailAccessRows(data.data ?? []);
        } finally {
            setLoadingEmailAccess(false);
        }
    }, [router]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    useEffect(() => {
        fetchEmailAccess();
    }, [fetchEmailAccess]);

    async function handleModerate() {
        if (!moderatingId) return;
        if (action === "reject" && !rejectReason.trim()) {
            alert("Ingresá el motivo de rechazo.");
            return;
        }

        setModerating(true);
        try {
            const res = await fetchAPI(`/admin/reviews/${moderatingId}/moderate`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, rejectedReason: action === "reject" ? rejectReason : undefined }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error ?? "Error al moderar.");
                return;
            }

            setModeratingId(null);
            setRejectReason("");
            fetchReviews();
        } finally {
            setModerating(false);
        }
    }

    async function handleToggleFeatured(id: string, current: boolean) {
        await fetchAPI(`/admin/reviews/${id}/featured`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isFeatured: !current }),
        });
        fetchReviews();
    }

    async function handleUpsertEmailAccess(e: FormEvent) {
        e.preventDefault();

        const normalizedEmail = quotaEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            alert("Ingresá un email.");
            return;
        }

        const quota = Number.parseInt(quotaValue, 10);
        if (!Number.isInteger(quota) || quota < 0) {
            alert("La cantidad de cupos debe ser un entero mayor o igual a 0.");
            return;
        }

        setSavingEmailAccess(true);
        try {
            const res = await fetchAPI("/admin/reviews/email-access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: normalizedEmail,
                    remainingReviews: quota,
                    notes: quotaNotes.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error ?? "No se pudo guardar la habilitación.");
                return;
            }

            setQuotaEmail("");
            setQuotaValue("1");
            setQuotaNotes("");
            await fetchEmailAccess();
        } finally {
            setSavingEmailAccess(false);
        }
    }

    async function handleEditQuota(access: ReviewEmailAccess) {
        const raw = window.prompt(
            `Ingresá los nuevos cupos restantes para ${access.email}:`,
            String(access.remainingReviews)
        );

        if (raw === null) return;

        const nextQuota = Number.parseInt(raw, 10);
        if (!Number.isInteger(nextQuota) || nextQuota < 0) {
            alert("La cantidad de cupos debe ser un entero mayor o igual a 0.");
            return;
        }

        const res = await fetchAPI(`/admin/reviews/email-access/${access.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remainingReviews: nextQuota }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error ?? "No se pudo actualizar el cupo.");
            return;
        }

        await fetchEmailAccess();
    }

    async function handleToggleEmailAccess(access: ReviewEmailAccess) {
        const res = await fetchAPI(`/admin/reviews/email-access/${access.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !access.isActive }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error ?? "No se pudo actualizar el estado.");
            return;
        }

        await fetchEmailAccess();
    }

    const pendingCount = reviews.filter((r) => r.status === "pending").length;

    return (
        <DashboardLayout>
            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Comunidad — Reseñas</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {total} reseña{total !== 1 ? "s" : ""} en total
                                {pendingCount > 0 && (
                                    <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                        {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                        <a
                            href="/comunidad"
                            target="_blank"
                            className="text-sm text-teal-600 hover:underline flex items-center gap-1"
                        >
                            Ver página pública
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                    {/* ... (rest of the content remains mostly the same, just indented and maybe some container tweaks) */}

                    {/* Filters */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {(["", "pending", "approved", "rejected"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === f
                                    ? "bg-teal-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {f === "" ? "Todas" : STATUS_LABELS[f].label}
                            </button>
                        ))}
                    </div>

                    <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Habilitación por email (sin orden)</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Configurá cuántas reseñas puede enviar un cliente sin compra detectada.
                        </p>

                        <form onSubmit={handleUpsertEmailAccess} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                            <input
                                type="email"
                                placeholder="cliente@email.com"
                                value={quotaEmail}
                                onChange={(e) => setQuotaEmail(e.target.value)}
                                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-xl text-sm"
                                required
                            />
                            <input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="Cupos"
                                value={quotaValue}
                                onChange={(e) => setQuotaValue(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
                                required
                            />
                            <button
                                type="submit"
                                disabled={savingEmailAccess}
                                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
                            >
                                {savingEmailAccess ? "Guardando..." : "Guardar cupos"}
                            </button>
                            <input
                                type="text"
                                placeholder="Nota interna (opcional)"
                                value={quotaNotes}
                                onChange={(e) => setQuotaNotes(e.target.value)}
                                className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-xl text-sm"
                            />
                        </form>

                        {loadingEmailAccess ? (
                            <p className="text-sm text-gray-500">Cargando habilitaciones...</p>
                        ) : emailAccessRows.length === 0 ? (
                            <p className="text-sm text-gray-500">Todavía no hay emails habilitados.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-100">
                                            <th className="py-2 pr-4">Email</th>
                                            <th className="py-2 pr-4">Disponibles</th>
                                            <th className="py-2 pr-4">Usadas</th>
                                            <th className="py-2 pr-4">Estado</th>
                                            <th className="py-2 pr-4">Último uso</th>
                                            <th className="py-2 pr-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emailAccessRows.map((access) => (
                                            <tr key={access.id} className="border-b border-gray-50">
                                                <td className="py-2 pr-4 text-gray-700">{access.email}</td>
                                                <td className="py-2 pr-4 font-semibold text-teal-700">{access.remainingReviews}</td>
                                                <td className="py-2 pr-4 text-gray-600">{access.usedReviews}</td>
                                                <td className="py-2 pr-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${access.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                                        {access.isActive ? "Activa" : "Pausada"}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4 text-gray-500">
                                                    {access.lastUsedAt ? new Date(access.lastUsedAt).toLocaleDateString("es-AR") : "-"}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditQuota(access)}
                                                            className="text-xs px-2 py-1 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                                                        >
                                                            Editar cupos
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleEmailAccess(access)}
                                                            className={`text-xs px-2 py-1 rounded-lg ${access.isActive ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                                                        >
                                                            {access.isActive ? "Pausar" : "Reactivar"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Reviews grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="text-5xl mb-3">🐾</div>
                            <p>No hay reseñas con este filtro.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {reviews.map((review) => (
                                <div key={review.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                                    {/* Image */}
                                    {review.imageUrl && (
                                        <div className="relative h-44 w-full">
                                            <Image
                                                src={review.imageUrl}
                                                alt={`Foto de ${review.petName}`}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 1200px) 50vw, 33vw"
                                            />
                                            {review.photoConsent && (
                                                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                                    📸 Consento Marketing
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="p-5">
                                        {/* Status badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABELS[review.status].className}`}>
                                                {STATUS_LABELS[review.status].label}
                                            </span>
                                            {review.isApproved && (
                                                <button
                                                    onClick={() => handleToggleFeatured(review.id, review.isFeatured)}
                                                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${review.isFeatured
                                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                        }`}
                                                    title={review.isFeatured ? "Quitar destacado" : "Destacar (Mascota del Mes)"}
                                                >
                                                    {review.isFeatured ? "⭐ Destacada" : "☆ Destacar"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                                {review.petName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{review.petName}</p>
                                                <p className="text-xs text-gray-400">{review.email}</p>
                                            </div>
                                        </div>

                                        <StarDisplay value={review.rating} />
                                        <p className="text-gray-600 text-sm mt-2 leading-relaxed line-clamp-3">{review.comment}</p>

                                        {review.rejectedReason && (
                                            <p className="text-xs text-red-500 mt-2 bg-red-50 px-2 py-1 rounded">
                                                Motivo: {review.rejectedReason}
                                            </p>
                                        )}

                                        {/* Meta */}
                                        <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 space-y-0.5">
                                            <p>
                                                📦 Orden: {review.orderId ? `${review.orderId.slice(0, 12)}…` : "Sin orden (habilitación manual)"}
                                            </p>
                                            <p>📅 {new Date(review.createdAt).toLocaleDateString("es-AR")}</p>
                                            {review.submittedFrom && <p>📍 {review.submittedFrom}</p>}
                                        </div>

                                        {/* Actions */}
                                        {review.status === "pending" && (
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    onClick={() => {
                                                        setModeratingId(review.id);
                                                        setAction("approve");
                                                        setRejectReason("");
                                                    }}
                                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                                                >
                                                    ✅ Aprobar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setModeratingId(review.id);
                                                        setAction("reject");
                                                        setRejectReason("");
                                                    }}
                                                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-medium py-2 rounded-xl transition-colors"
                                                >
                                                    ❌ Rechazar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Moderation modal */}
                    {moderatingId && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">
                                    {action === "approve" ? "✅ Aprobar reseña" : "❌ Rechazar reseña"}
                                </h3>

                                {action === "approve" ? (
                                    <p className="text-gray-500 mb-6">
                                        La reseña se publicará en la galería pública y se notificará al cliente por email.
                                    </p>
                                ) : (
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Motivo de rechazo *
                                        </label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Ej: Contenido inapropiado, no relacionado con el producto…"
                                            rows={3}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setModeratingId(null)}
                                        className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleModerate}
                                        disabled={moderating}
                                        className={`flex-1 text-white py-3 rounded-xl font-medium transition-colors ${action === "approve"
                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                            : "bg-red-500 hover:bg-red-600"
                                            }`}
                                    >
                                        {moderating ? "Procesando…" : action === "approve" ? "Confirmar aprobación" : "Confirmar rechazo"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
