"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastAction { label: string; onClick: () => void; }
interface ToastOptions { err?: boolean; action?: ToastAction; duration?: number; }
interface ToastCtx { show: (msg: string, opts?: boolean | ToastOptions) => void; }

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ msg: string; err: boolean; action?: ToastAction; visible: boolean }>({
    msg: "", err: false, visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const hide = useCallback(() => setState(s => ({ ...s, visible: false })), []);

  // Aceita o formato antigo show(msg, true) para erro, ou um objeto de opções.
  const show = useCallback((msg: string, opts?: boolean | ToastOptions) => {
    const o: ToastOptions = typeof opts === "boolean" ? { err: opts } : opts ?? {};
    clearTimeout(timer.current);
    setState({ msg, err: !!o.err, action: o.action, visible: true });
    timer.current = setTimeout(hide, o.duration ?? (o.action ? 5000 : 2500));
  }, [hide]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed z-toast left-4 right-[5.5rem] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:bottom-6 md:-translate-x-1/2 md:max-w-md
          flex items-center gap-3 pl-4 pr-2 py-2 min-h-[48px] rounded-2xl text-sm font-medium shadow-2xl transition-all duration-300 ease-out ${
          state.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        } ${state.err ? "bg-danger text-white" : "bg-heading text-card"}`}
      >
        <span className="flex-1 min-w-0 py-1">{state.msg}</span>
        {state.action && (
          <button
            onClick={() => { state.action?.onClick(); hide(); }}
            className="shrink-0 rounded-xl px-3 py-1.5 font-semibold text-brand-inverse hover:bg-card/10 transition-colors"
          >
            {state.action.label}
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}
