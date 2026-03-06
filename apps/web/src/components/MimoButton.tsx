"use client";

import { useState, useEffect } from "react";
import { addMimo, hasVotedLocally } from "@/lib/mimo";

interface MimoButtonProps {
    reviewId: string;
    initialCount: number;
    initialLevel?: string;
    initialIcon?: string;
    onMimoAdded?: (newCount: number, newLevel: string, newIcon: string) => void;
}

export function MimoButton({
    reviewId,
    initialCount,
    onMimoAdded
}: MimoButtonProps) {
    const [mimos, setMimos] = useState(initialCount);
    const [isAnimating, setIsAnimating] = useState(false);
    const [alreadyVoted, setAlreadyVoted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasVotedLocally(reviewId)) {
            setAlreadyVoted(true);
        }
    }, [reviewId]);

    const handleMimo = async () => {
        if (alreadyVoted || isAnimating) return;

        setIsAnimating(true);
        try {
            const result = await addMimo(reviewId);
            setMimos(result.mimoCount);
            setAlreadyVoted(result.alreadyVoted);

            if (onMimoAdded) {
                onMimoAdded(result.mimoCount, result.level, result.levelIcon);
            }

            // Animation trigger
            setTimeout(() => setIsAnimating(false), 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error");
            setIsAnimating(false);
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleMimo}
                disabled={alreadyVoted}
                className={`
          relative group flex items-center gap-3 px-6 py-3 rounded-full font-bold transition-all duration-300
          ${alreadyVoted
                        ? "bg-emerald-50 text-emerald-600 shadow-inner cursor-default"
                        : "bg-white text-teal-600 shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 border-2 border-teal-100"}
        `}
            >
                <span className={`text-2xl transition-transform duration-500 ${isAnimating ? "scale-150 rotate-12" : "group-hover:scale-110"}`}>
                    {alreadyVoted ? "🐾💚" : "🐾"}
                </span>

                <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm uppercase tracking-wider">
                        {alreadyVoted ? "¡Mimo enviado!" : "Regalar un mimo"}
                    </span>
                    <span className="text-xs font-medium opacity-60">
                        {mimos} {mimos === 1 ? "mimo recibido" : "mimos recibidos"}
                    </span>
                </div>

                {/* Floating Hearts Animation */}
                {isAnimating && (
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(5)].map((_, i) => (
                            <span
                                key={i}
                                className="absolute text-xl animate-ping opacity-0"
                                style={{
                                    left: `${20 + Math.random() * 60}%`,
                                    top: `${Math.random() * 40}%`,
                                    animation: `float-up 1s ease-out forwards`,
                                    animationDelay: `${i * 0.1}s`
                                }}
                            >
                                💚
                            </span>
                        ))}
                    </div>
                )}
            </button>

            {error && (
                <span className="text-[10px] text-red-500 font-medium animate-pulse">
                    {error}
                </span>
            )}

            <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
        }
      `}</style>
        </div>
    );
}

export function MimoLevelBadge({ level, icon }: { level?: string; icon?: string }) {
    if (!level) return null;

    const colors: Record<string, string> = {
        "Peludo tierno": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "Rompe corazones": "bg-red-50 text-red-700 border-red-100",
        "Estrella Pawgo": "bg-amber-50 text-amber-700 border-amber-100",
        "Leyenda Peluda": "bg-purple-50 text-purple-700 border-purple-100"
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${colors[level] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
            <span>{icon || "💚"}</span>
            <span>{level}</span>
        </div>
    );
}
