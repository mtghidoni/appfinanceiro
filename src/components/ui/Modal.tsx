"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({ open, onClose, children, width = "440px" }: Props) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 z-modal flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card rounded-t-3xl sm:rounded-2xl px-5 sm:px-7 pt-6 sm:pt-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-[0_20px_60px_rgba(0,0,0,.25)] max-w-full sm:max-w-[calc(100vw-32px)] max-h-[92dvh] overflow-y-auto"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}
