"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

interface Toast {
  id: string;
  title?: string;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (props: { title?: string; message: string; type?: "success" | "error" | "info" }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, message, type = "info" }: { title?: string; message: string; type?: "success" | "error" | "info" }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-md w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start p-4 rounded-lg shadow-lg border transition-all duration-300 bg-white ${
              t.type === "success"
                ? "border-emerald-500 text-emerald-900 bg-emerald-50/90"
                : t.type === "error"
                ? "border-red-500 text-red-900 bg-red-50/90"
                : "border-blue-500 text-blue-900 bg-blue-50/90"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />}
            {t.type === "info" && <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />}
            <div className="flex-1 mr-2">
              {t.title && <h4 className="font-semibold text-sm mb-1">{t.title}</h4>}
              <p className="text-sm font-medium leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
