"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import imageCompression from "browser-image-compression";
import { API_URL } from "@/lib/config";

import { Footer } from "@/components/Footer";
import { MimoButton, MimoLevelBadge } from "@/components/MimoButton";
import { getMonthlyRanking } from "@/lib/mimo";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Review {
    id: string;
    petName: string;
    rating: number;
    comment: string;
    imageUrl: string | null;
    imageThumbUrl: string | null;
    purchaseVerified: boolean;
    isFeatured: boolean;
    mimoCount: number;
    mimoLevel?: string;
    mimoIcon?: string;
    createdAt: string;
}

type Step = "gallery" | "email" | "form" | "success" | "already_reviewed" | "no_purchase";

// ─── Star Rating Component ─────────────────────────────────────────────────────
function StarRating({
    value,
    onChange,
    readonly = false,
    size = "md",
}: {
    value: number;
    onChange?: (v: number) => void;
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
}) {
    const [hovered, setHovered] = useState(0);
    const sizes = { sm: "w-4 h-4", md: "w-7 h-7", lg: "w-9 h-9" };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange?.(star)}
                    onMouseEnter={() => !readonly && setHovered(star)}
                    onMouseLeave={() => !readonly && setHovered(0)}
                    className={`${sizes[size]} transition-transform ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
                    aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill={(hovered || value) >= star ? "#F59E0B" : "none"}
                        stroke={(hovered || value) >= star ? "#F59E0B" : "#D1D5DB"}
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                    </svg>
                </button>
            ))}
        </div>
    );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, onClick }: { review: Review; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500 cursor-pointer hover:-translate-y-1.5 aspect-[3/4]"
        >
            {review.imageUrl ? (
                <Image
                    src={review.imageThumbUrl || review.imageUrl || ""}
                    alt={`Foto de ${review.petName}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-teal-50 text-4xl">🐾</div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Thumbnail Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xs">
                        {review.petName.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-sm truncate">{review.petName}</p>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                    <StarRating value={review.rating} readonly size="sm" />
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <span>{review.mimoIcon || "🐾"}</span>
                        <span>{review.mimoCount || 0}</span>
                    </div>
                </div>
            </div>

            {/* Verification Badge (Top Right) */}
            {review.purchaseVerified && (
                <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-sm text-white p-1 rounded-full shadow-lg">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ─── Main Page Content ────────────────────────────────────────────────────────
function ComunidadPageContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("gallery");
    const [reviews, setReviews] = useState<Review[]>([]);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [ranking, setRanking] = useState<Review[]>([]);
    const [loadingRanking, setLoadingRanking] = useState(true);

    // Step 1 — Email
    const [email, setEmail] = useState(searchParams.get("email") ?? "");
    const [validatingEmail, setValidatingEmail] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [orderId, setOrderId] = useState("");
    const [existingReviewStatus, setExistingReviewStatus] = useState("");

    // Step 2 — Form
    const [petName, setPetName] = useState("");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [photoConsent, setPhotoConsent] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string>("");
    const [imageCompressing, setImageCompressing] = useState(false);
    const [imageInfo, setImageInfo] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successPetName, setSuccessPetName] = useState("");
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);

    const formRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);

    const closeModal = () => {
        setStep("gallery");
        setEmailError("");
    };

    // Load reviews and ranking on mount
    useEffect(() => {
        setLoadingReviews(true);
        setLoadingRanking(true);

        fetch(`${API_URL}/reviews?limit=12&sort=recent`)
            .then((r) => r.json())
            .then((data) => {
                setReviews(data.data ?? []);
                setTotalReviews(data.pagination?.total ?? 0);
            })
            .catch(console.error)
            .finally(() => setLoadingReviews(false));

        getMonthlyRanking()
            .then(setRanking)
            .catch(console.error)
            .finally(() => setLoadingRanking(false));
    }, []);

    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_IMAGE_SIZE_MB = 15;
    const COMPRESS_TARGET_MB = 1.5; // compress client-side if above this threshold

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // reset so user can re-select the same file

        setImageError("");
        setImageInfo("");
        setImageCompressing(false);
        if (!file) return;

        // 1. Validate MIME type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setImageError("Solo se permiten imágenes JPG, PNG o WebP.");
            return;
        }

        // 2. Validate size hard limit
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > MAX_IMAGE_SIZE_MB) {
            setImageError(
                `La imagen pesa ${sizeMB.toFixed(1)}MB. El máximo permitido es ${MAX_IMAGE_SIZE_MB}MB.`
            );
            return;
        }

        // 3. Compress client-side if above threshold
        let finalFile = file;
        if (sizeMB > COMPRESS_TARGET_MB) {
            setImageCompressing(true);
            try {
                finalFile = await imageCompression(file, {
                    maxSizeMB: COMPRESS_TARGET_MB,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: "image/jpeg",
                    initialQuality: 0.85,
                });
                const finalMB = (finalFile.size / 1024 / 1024).toFixed(1);
                setImageInfo(`Optimizada: ${sizeMB.toFixed(1)}MB → ${finalMB}MB`);
            } catch {
                // Si falla la compresión client-side, el backend comprime igual
                finalFile = file;
            } finally {
                setImageCompressing(false);
            }
        }

        setImageFile(finalFile);
        setImagePreview(URL.createObjectURL(finalFile));
    }

    async function handleValidateEmail(e: React.FormEvent) {
        e.preventDefault();
        setEmailError("");
        if (!email.trim()) {
            setEmailError("Por favor ingresá tu email.");
            return;
        }
        setValidatingEmail(true);
        try {
            const res = await fetch(`${API_URL}/reviews/validate-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            const data = await res.json();
            if (data.canReview) {
                setOrderId(data.orderId);
                setStep("form");
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            } else if (data.reason === "already_reviewed") {
                setExistingReviewStatus(data.reviewStatus ?? "");
                setStep("already_reviewed");
            } else {
                setStep("no_purchase");
            }
        } catch {
            setEmailError("Error de red. Intentá de nuevo.");
        } finally {
            setValidatingEmail(false);
        }
    }

    async function handleSubmitReview(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError("");

        if (!rating) return setSubmitError("Por favor seleccioná una puntuación.");
        if (comment.trim().length < 10) return setSubmitError("El comentario debe tener al menos 10 caracteres.");

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("orderId", orderId);
            formData.append("petName", petName);
            formData.append("rating", String(rating));
            formData.append("comment", comment);
            formData.append("photoConsent", String(photoConsent));
            if (imageFile) formData.append("image", imageFile);

            const res = await fetch(`${API_URL}/reviews`, {
                method: "POST",
                headers: { "x-submission-source": "qr_card" },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Error al enviar la reseña.");
            }

            setSuccessPetName(petName);
            setStep("success");
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Error inesperado.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-white">
            {/* ── HERO ───────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-white">
                <div className="absolute inset-0 opacity-10">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-7xl animate-bounce"
                            style={{
                                left: `${(i * 17 + 5) % 100}%`,
                                top: `${(i * 23 + 10) % 80}%`,
                                animationDelay: `${i * 0.4}s`,
                                animationDuration: `${2 + i * 0.3}s`,
                            }}
                        >
                            🐾
                        </div>
                    ))}
                </div>
                <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
                    <p className="text-cyan-100 text-sm font-semibold uppercase tracking-widest mb-4">Comunidad PawGo</p>
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                        Tu peludo merece<br />
                        <span className="text-yellow-300">ser la estrella</span> 🌟
                    </h1>
                    <p className="text-lg md:text-xl text-cyan-100 max-w-2xl mx-auto mb-4">
                        Mirá cómo otros peludos disfrutan su PawGo y compartí tu experiencia con la comunidad.
                    </p>
                    {totalReviews > 0 && (
                        <p className="text-cyan-200 text-sm font-medium mb-10">
                            🐾 +{totalReviews} familias ya compartieron su experiencia
                        </p>
                    )}
                    <button
                        onClick={() => setStep("email")}
                        className="inline-flex items-center gap-2 bg-white text-teal-600 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                        id="cta-compartir-resena"
                    >
                        ¡Quiero compartir mi reseña!
                        <span className="text-2xl">🐾</span>
                    </button>
                </div>
            </section>

            {/* ── EMAIL VALIDATION MODAL ────────────────────────────────────── */}
            {(step === "email" || step === "no_purchase" || step === "already_reviewed") && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity duration-300"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div
                        ref={modalContentRef}
                        className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-lg w-full relative animate-in fade-in zoom-in duration-300"
                    >
                        {/* Close button (top right) */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {step === "email" && (
                            <>
                                <div className="text-center mb-8">
                                    <div className="text-5xl mb-4">📧</div>
                                    <h2 className="text-2xl font-bold text-gray-800">Verificá tu compra</h2>
                                    <p className="text-gray-500 mt-2">Ingresá el email con el que compraste para continuar.</p>
                                </div>
                                <form onSubmit={handleValidateEmail} className="space-y-4">
                                    <div>
                                        <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-1">
                                            Email de compra
                                        </label>
                                        <input
                                            id="email-input"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@email.com"
                                            className="input-field"
                                            autoComplete="email"
                                            required
                                        />
                                        {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="btn-secondary flex-1"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={validatingEmail}
                                            className="btn-primary flex-[2] flex items-center justify-center gap-2"
                                        >
                                            {validatingEmail ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Verificando…
                                                </>
                                            ) : (
                                                "Verificar compra →"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === "no_purchase" && (
                            <div className="text-center py-4">
                                <div className="text-5xl mb-4">🔍</div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">No encontramos tu compra</h2>
                                <p className="text-gray-500 mb-6">
                                    No hay una compra asociada a <strong>{email}</strong>. ¿Usaste otro email?
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => { setEmail(""); setStep("email"); }} className="btn-primary w-full">
                                        Intentar con otro email
                                    </button>
                                    <button onClick={closeModal} className="btn-secondary w-full">
                                        Cerrar
                                    </button>
                                </div>
                                <div className="mt-6">
                                    <a href="mailto:soporte@pawgo-pet.com" className="text-sm text-teal-600 hover:underline">
                                        Contactar soporte
                                    </a>
                                </div>
                            </div>
                        )}

                        {step === "already_reviewed" && (
                            <div className="text-center py-4">
                                <div className="text-5xl mb-4">✅</div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">¡Ya compartiste tu experiencia!</h2>
                                <p className="text-gray-500 mb-2">
                                    Tu reseña está{" "}
                                    <span className="font-medium text-teal-600">
                                        {existingReviewStatus === "approved"
                                            ? "publicada"
                                            : existingReviewStatus === "rejected"
                                                ? "rechazada"
                                                : "pendiente de aprobación"}
                                    </span>
                                    .
                                </p>
                                {existingReviewStatus === "approved" ? (
                                    <p className="text-gray-400 text-sm">Podés verla en la galería de arriba.</p>
                                ) : existingReviewStatus === "pending" ? (
                                    <p className="text-gray-400 text-sm">La revisamos y la publicamos en breve. ¡Gracias!</p>
                                ) : null}
                                <button onClick={closeModal} className="btn-primary w-full mt-8">
                                    Ver la comunidad
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── REVIEW FORM ────────────────────────────────────────────────── */}
            {step === "form" && (
                <section className="max-w-xl mx-auto px-4 py-12" ref={formRef}>
                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-sm text-emerald-700 font-medium">¡Tu compra está verificada!</p>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Contanos la experiencia 🐾</h2>

                        <form onSubmit={handleSubmitReview} className="space-y-6">
                            {/* Pet name */}
                            <div>
                                <label htmlFor="pet-name" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Nombre de tu mascota *
                                </label>
                                <input
                                    id="pet-name"
                                    type="text"
                                    value={petName}
                                    onChange={(e) => setPetName(e.target.value)}
                                    placeholder="Ej: Max, Luna, Coco…"
                                    maxLength={50}
                                    className="input-field"
                                    required
                                />
                            </div>

                            {/* Rating */}
                            <div>
                                <p className="block text-sm font-semibold text-gray-700 mb-2">
                                    ¿Cómo calificarías tu PawGo? *
                                </p>
                                <StarRating value={rating} onChange={setRating} size="lg" />
                                {rating > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {["", "Malo 😕", "Regular 🙁", "Bueno 🙂", "Muy bueno 😊", "¡Excelente! 🤩"][rating]}
                                    </p>
                                )}
                            </div>

                            {/* Comment */}
                            <div>
                                <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Contanos la experiencia *{" "}
                                    <span className="text-gray-400 font-normal">({comment.length}/500)</span>
                                </label>
                                <textarea
                                    id="review-comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="¿Cómo reaccionó tu mascota? ¿Qué fue lo que más te gustó del pretal?"
                                    rows={4}
                                    maxLength={500}
                                    className="input-field resize-none"
                                    required
                                />
                            </div>

                            {/* Image upload */}
                            <div>
                                <p className="block text-sm font-semibold text-gray-700 mb-1">
                                    📸 Foto de tu peludo{" "}
                                    <span className="text-gray-400 font-normal">(opcional pero ¡adoramos verlos!)</span>
                                </p>
                                <label
                                    htmlFor="review-image"
                                    className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-teal-300 rounded-xl cursor-pointer bg-teal-50 hover:bg-teal-100 transition-colors"
                                >
                                    {imagePreview ? (
                                        <div className="relative w-full h-full">
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover rounded-xl" />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); setImageError(""); setImageInfo(""); }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : imageCompressing ? (
                                        <div className="text-center p-4">
                                            <svg className="animate-spin h-8 w-8 mx-auto text-teal-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <p className="text-sm text-teal-600 font-medium mt-2">Optimizando…</p>
                                        </div>
                                    ) : (
                                        <div className="text-center p-4">
                                            <span className="text-3xl">📷</span>
                                            <p className="text-sm text-teal-600 font-medium mt-1">Subir foto</p>
                                            <p className="text-xs text-gray-400">JPG, PNG o WebP · máx. 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        id="review-image"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleImageChange}
                                        disabled={imageCompressing}
                                        className="hidden"
                                    />
                                </label>
                                {imageError && (
                                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
                                        <span>⚠️</span> {imageError}
                                    </p>
                                )}
                                {imageCompressing && (
                                    <p className="text-sm text-teal-600 mt-2 flex items-center gap-1.5">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Optimizando imagen…
                                    </p>
                                )}
                                {imageInfo && !imageCompressing && (
                                    <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1.5">
                                        <span>✅</span> {imageInfo}
                                    </p>
                                )}
                            </div>

                            {/* Photo consent */}
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={photoConsent}
                                    onChange={(e) => setPhotoConsent(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                                    Autorizo a PawGo a usar mi foto y la de mi mascota en redes sociales e email marketing. (Opcional)
                                </span>
                            </label>

                            {submitError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                    {submitError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || imageCompressing}
                                className="btn-primary w-full flex items-center justify-center gap-2 text-base"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Enviando…
                                    </>
                                ) : (
                                    <>Enviar reseña 🐾</>
                                )}
                            </button>
                        </form>
                    </div>
                </section>
            )}

            {/* ── SUCCESS ───────────────────────────────────────────────────── */}
            {step === "success" && (
                <section className="max-w-lg mx-auto px-4 py-16 text-center">
                    <div className="bg-white rounded-3xl shadow-xl p-10">
                        <div className="text-7xl mb-6 animate-bounce">🐾</div>
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-3">
                            ¡Gracias, {successPetName}!
                        </h2>
                        <p className="text-gray-500 mb-4 leading-relaxed">
                            Tu reseña está en camino. En breve el equipo PawGo la revisará para que el mundo la vea.
                        </p>
                        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Pendiente de aprobación
                        </div>
                        <button
                            onClick={() => setStep("gallery")}
                            className="btn-secondary w-full"
                        >
                            Volver a ver la comunidad
                        </button>
                    </div>
                </section>
            )}

            {/* ── RANKING / PELUDO DEL MES ─────────────────────────────────── */}
            {ranking.length > 0 && (
                <section className="max-w-6xl mx-auto px-4 py-8">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] p-8 md:p-12 border border-amber-100 flex flex-col md:flex-row items-center gap-8 md:gap-12 relative overflow-hidden">
                        {/* Decorative Background Icons */}
                        <div className="absolute -top-6 -right-6 text-8xl opacity-10 rotate-12">👑</div>
                        <div className="absolute -bottom-6 -left-6 text-8xl opacity-10 -rotate-12">⭐</div>

                        {/* Winner Illustration/Photo */}
                        <div className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0 group">
                            <div className="absolute inset-0 bg-amber-400 rounded-[3rem] rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-amber-200 rounded-[3rem] -rotate-3 group-hover:-rotate-6 transition-transform duration-500" />
                            <div
                                className="relative w-full h-full rounded-[3rem] overflow-hidden border-4 border-white shadow-xl cursor-pointer"
                                onClick={() => setSelectedReview(ranking[0])}
                            >
                                <Image
                                    src={ranking[0].imageThumbUrl || ranking[0].imageUrl || ""}
                                    alt={ranking[0].petName}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute -top-4 -left-4 bg-amber-400 text-amber-950 font-black px-4 py-2 rounded-2xl shadow-lg -rotate-12 border-2 border-white">
                                Peludo del Mes 🏆
                            </div>
                        </div>

                        {/* Winner Content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-amber-200 text-amber-900 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-4">
                                👑 {ranking[0].mimoLevel || "Leyenda Peluda"}
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
                                {ranking[0].petName} <span className="text-teal-500 text-3xl">🐾💚</span>
                            </h2>
                            <p className="text-lg text-gray-600 mb-8 max-w-xl italic">
                                &quot;{ranking[0].comment?.length > 120 ? ranking[0].comment.slice(0, 120) + "..." : ranking[0].comment}&quot;
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-sm border border-amber-100">
                                    <span className="text-2xl">🦴</span>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-xl font-bold text-amber-600">{ranking[0].mimoCount}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-tight">Mimos recibidos</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedReview(ranking[0])}
                                    className="px-8 py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-lg"
                                >
                                    ¡Ver su historia! ✨
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── GALLERY ───────────────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-2">La familia PawGo 🐕</h2>
                    <p className="text-gray-500">Peludos felices con su pretal favorito</p>
                </div>

                {loadingReviews ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-6xl mb-4">🌱</div>
                        <p className="text-lg font-medium">¡Sé el primero en compartir!</p>
                        <p className="text-sm mt-1">La comunidad está esperando tu historia.</p>
                        <button
                            onClick={() => setStep("email")}
                            className="btn-primary mt-6 inline-flex"
                        >
                            Compartir mi reseña 🐾
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {reviews.map((review) => (
                            <ReviewCard key={review.id} review={review} onClick={() => setSelectedReview(review)} />
                        ))}
                    </div>
                )}

                {/* ── REVIEW DETAIL MODAL ─────────────────────────────────────── */}
                {selectedReview && (
                    <div
                        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex items-center justify-center md:p-6 transition-all duration-500 overflow-hidden"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedReview(null);
                        }}
                    >
                        <div className="bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden w-full h-full md:max-w-7xl md:h-[85vh] flex flex-col md:flex-row items-stretch relative animate-in fade-in zoom-in duration-500 slide-in-from-bottom-10">
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedReview(null)}
                                className="absolute top-6 right-6 z-[160] bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-all backdrop-blur-md border border-white/30 active:scale-95"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Left: Image (Large - 70% Desktop) */}
                            <div className="relative w-full h-[60vh] md:h-auto md:w-[70%] bg-zinc-950 flex-shrink-0 group">
                                {selectedReview.imageUrl ? (
                                    <Image
                                        src={selectedReview.imageUrl}
                                        alt={`Foto de ${selectedReview.petName}`}
                                        fill
                                        className="object-contain md:object-cover"
                                        sizes="(max-width: 768px) 100vw, 70vw"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-8xl">
                                        🐾
                                    </div>
                                )}
                                {/* Mobile Close Button Overlay */}
                                <div className="absolute inset-0 md:hidden pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>

                            {/* Right: Content (30% Desktop) */}
                            <div className="w-full md:w-[30%] bg-white p-6 sm:p-10 flex flex-col md:overflow-y-auto border-l border-gray-100">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-black text-3xl shadow-lg ring-4 ring-cyan-50">
                                        {selectedReview.petName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-3xl font-black text-gray-900 leading-tight">{selectedReview.petName}</h3>
                                            <MimoLevelBadge
                                                level={selectedReview.mimoLevel}
                                                icon={selectedReview.mimoIcon}
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StarRating value={selectedReview.rating} readonly size="sm" />
                                            {selectedReview.purchaseVerified && (
                                                <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                                                    Verificada
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="relative pt-6 min-h-[100px]">
                                        <p className="text-gray-700 text-lg leading-relaxed font-medium">
                                            {selectedReview.comment}
                                        </p>
                                    </div>

                                    {/* Mimo Interaction */}
                                    <div className="mt-8">
                                        <MimoButton
                                            reviewId={selectedReview.id}
                                            initialCount={selectedReview.mimoCount}
                                            onMimoAdded={(count, level, icon) => {
                                                const updatedReview = { ...selectedReview, mimoCount: count, mimoLevel: level, mimoIcon: icon };
                                                setSelectedReview(updatedReview);
                                                setReviews(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
                                                setRanking(prev => prev.map(r => r.id === selectedReview.id ? updatedReview : r));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-widest">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-300">Publicado</span>
                                        <span className="text-gray-600">{new Date(selectedReview.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-teal-500">
                                        <span>PawGo Fam</span>
                                        <span className="text-xl">🐾</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA sticky bottom on mobile */}
                {step === "gallery" && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
                        <button
                            onClick={() => setStep("email")}
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                            id="cta-mobile-sticky"
                        >
                            <span>¡Quiero dejar mi reseña!</span>
                            <span>🐾</span>
                        </button>
                    </div>
                )}
            </section>
            <Footer />
        </div>
    );
}

export default function ComunidadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
        }>
            <ComunidadPageContent />
        </Suspense>
    );
}
