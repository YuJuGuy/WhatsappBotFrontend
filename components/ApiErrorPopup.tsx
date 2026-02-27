'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ApiError {
    id: number;
    message: string;
    status?: number;
}

let errorIdCounter = 0;
type ErrorListener = (error: ApiError) => void;
const listeners: Set<ErrorListener> = new Set();

/** Call this from api.ts to push an error to the popup */
export function pushApiError(message: string, status?: number) {
    const error: ApiError = { id: ++errorIdCounter, message, status };
    listeners.forEach((fn) => fn(error));
}

export default function ApiErrorPopup() {
    const [errors, setErrors] = useState<ApiError[]>([]);

    const handleError = useCallback((error: ApiError) => {
        setErrors((prev) => [...prev, error]);
        // Auto-dismiss after 6 seconds
        setTimeout(() => {
            setErrors((prev) => prev.filter((e) => e.id !== error.id));
        }, 6000);
    }, []);

    useEffect(() => {
        listeners.add(handleError);
        return () => { listeners.delete(handleError); };
    }, [handleError]);

    const dismiss = (id: number) => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
    };

    if (errors.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-[9999] flex flex-col gap-2 w-[90vw] max-w-sm" dir="rtl">
            {errors.map((err) => (
                <div
                    key={err.id}
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-950/90 border border-red-500/30 backdrop-blur-md shadow-2xl shadow-red-500/10 animate-in slide-in-from-bottom-4 fade-in duration-300"
                >
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        {err.status && (
                            <p className="text-[10px] text-red-400/60 font-mono mb-0.5">
                                خطأ {err.status}
                            </p>
                        )}
                        <p className="text-sm text-red-100 leading-relaxed break-words">
                            {err.message}
                        </p>
                    </div>
                    <button
                        onClick={() => dismiss(err.id)}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-red-400/60" />
                    </button>
                </div>
            ))}
        </div>
    );
}
