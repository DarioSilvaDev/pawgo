"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        title: options.title ?? "Confirmar",
        message: options.message,
        confirmText: options.confirmText ?? "Confirmar",
        cancelText: options.cancelText ?? "Cancelar",
        destructive: options.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((prev) => {
      if (prev) prev.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, state]);

  const ConfirmDialog = useMemo(() => {
    if (!state) return null;

    const confirmStyles = state.destructive
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
      : "bg-primary-turquoise hover:bg-primary-turquoise/90 focus:ring-primary-turquoise";

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => close(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div
          className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {state.title}
          </h2>
          <p id={descId} className="mt-2 text-sm text-gray-600">
            {state.message}
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => close(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise"
            >
              {state.cancelText}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmStyles}`}
            >
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }, [close, descId, state, titleId]);

  return { confirm, ConfirmDialog };
}

