const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Gets or creates a unique fingerprint for this browser/device.
 * Stored in localStorage for persistence.
 */
export function getFingerprint(): string {
    if (typeof window === "undefined") return "server-side";

    let fingerprint = localStorage.getItem("pawgo_mimo_fingerprint");

    if (!fingerprint) {
        // Basic unique ID generation
        fingerprint = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        localStorage.setItem("pawgo_mimo_fingerprint", fingerprint);
    }

    return fingerprint;
}

/**
 * Checks if the user has already voted for this review locally.
 */
export function hasVotedLocally(reviewId: string): boolean {
    if (typeof window === "undefined") return false;
    try {
        const voted = JSON.parse(localStorage.getItem("pawgo_voted_reviews") || "[]");
        return Array.isArray(voted) && voted.includes(reviewId);
    } catch {
        return false;
    }
}

/**
 * Marks a review as voted locally.
 */
export function markAsVotedLocally(reviewId: string) {
    if (typeof window === "undefined") return;
    try {
        const voted = JSON.parse(localStorage.getItem("pawgo_voted_reviews") || "[]");
        if (Array.isArray(voted) && !voted.includes(reviewId)) {
            voted.push(reviewId);
            localStorage.setItem("pawgo_voted_reviews", JSON.stringify(voted));
        }
    } catch {
        localStorage.setItem("pawgo_voted_reviews", JSON.stringify([reviewId]));
    }
}

/**
 * Sends a "mimo" to a review.
 */
export async function addMimo(reviewId: string) {
    const fingerprint = getFingerprint();

    const res = await fetch(`${API_URL}/reviews/${reviewId}/mimo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // If the user happens to have a token, the backend might use it
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ fingerprint })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al regalar mimo");
    }

    const data = await res.json();
    markAsVotedLocally(reviewId);
    return data;
}

/**
 * Gets the current monthly ranking.
 */
export async function getMonthlyRanking() {
    const res = await fetch(`${API_URL}/reviews/ranking`);
    if (!res.ok) return [];
    return res.json();
}
