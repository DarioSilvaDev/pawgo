"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  durationMs?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = "info",
  durationMs = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose]);

  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : type === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-[calc(100%-2rem)]">
      <div
        role="status"
        className={`border rounded-lg shadow-lg px-4 py-3 flex items-start justify-between gap-3 ${styles}`}
      >
        <div className="text-sm font-medium leading-5">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="text-current/70 hover:text-current text-sm font-semibold"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

