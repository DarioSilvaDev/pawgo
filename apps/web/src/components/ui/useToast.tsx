"use client";

import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Toast, type ToastType } from "@/components/ui/Toast";

export interface ShowToastOptions {
  message: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastState extends Required<ShowToastOptions> {
  id: number;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((options: ShowToastOptions) => {
    setToast({
      id: Date.now(),
      message: options.message,
      type: options.type ?? "info",
      durationMs: options.durationMs ?? 3000,
    });
  }, []);

  const ToastView: ReactElement | null = useMemo(() => {
    if (!toast) return null;
    return (
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        durationMs={toast.durationMs}
        onClose={() => setToast(null)}
      />
    );
  }, [toast]);

  return { showToast, ToastView };
}

