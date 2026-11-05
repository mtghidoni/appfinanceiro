"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  /** Com título, mostra um cabeçalho com botão de fechar. */
  title?: string;
}

/**
 * Diálogo que vira "bottom sheet" no celular (sobe da parte de baixo)
 * e janela centralizada a partir de telas médias.
 */
export default function Modal({ open, onClose, children, width = "440px", title }: Props) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 z-modal flex items-end sm:items-center justify-center animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-card w-full sm:w-auto rounded-t-3xl sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.25)] sm:max-w-[calc(100vw-32px)] max-h-[92dvh] overflow-y-auto overscroll-contain animate-sheet-in sm:animate-pop-in"
        style={{ ["--w" as string]: width }}
      >
        <div className="sm:w-[var(--w)] px-5 sm:px-7 pt-3 sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6">
          <div className="sm:hidden w-10 h-1 bg-border rounded-full mx-auto mb-3" aria-hidden />
          {title && (
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-heading">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="size-9 -mr-2 grid place-items-center rounded-full text-muted hover:text-apptext hover:bg-thead transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
