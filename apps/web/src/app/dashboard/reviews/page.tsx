"use client";

import { useState, useEffect, useCallback } from "react";
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
    orderId: string;
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

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

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
                                            <p>📦 Orden: {review.orderId.slice(0, 12)}…</p>
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
