"use client";

// Peças de formulário compartilhadas pelos modais de contas, transações e importação.

export const FIELD =
  "w-full border border-border rounded-xl px-3.5 py-3 text-base bg-bg text-apptext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition placeholder:text-muted/70";

export const BTN_PRIMARY =
  "rounded-full bg-brand text-onbrand px-6 py-3 sm:py-2.5 text-[15px] sm:text-sm font-semibold hover:bg-brand/90 active:scale-[.98] transition disabled:opacity-40 disabled:pointer-events-none";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1.5 leading-relaxed">{hint}</span>}
    </label>
  );
}

const COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

/** Grupo de botões em que só um fica ativo (ex: Saída / Entrada). */
export function Segmented<T extends string>({ value, options, onChange, label, cols }: {
  value: T;
  options: { v: T; label: string; activeClass?: string }[];
  onChange: (v: T) => void;
  label: string;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols ?? COLS[options.length] ?? "grid-cols-3"} gap-1 rounded-xl bg-thead p-1`} role="group" aria-label={label}>
      {options.map(o => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={active}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
              active ? (o.activeClass ?? "bg-card text-apptext") + " shadow-sm" : "text-muted hover:text-apptext"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Campo de valor em destaque ("R$ 0,00"). Aceita sinal de menos quando `allowNegative`. */
export function MoneyInput({ value, onChange, inputRef, allowNegative = false, label, className = "" }: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  allowNegative?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-muted mb-1.5">{label}</span>
      <div className="flex items-baseline gap-2 border-b-2 border-border focus-within:border-accent transition-colors pb-1">
        <span className="text-2xl font-semibold text-muted">R$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={e => onChange(e.target.value.replace(allowNegative ? /[^\d.,-]/g : /[^\d.,]/g, ""))}
          className={`flex-1 min-w-0 bg-transparent outline-none text-[32px] leading-tight font-semibold tabular-nums tracking-tight placeholder:text-muted/50 ${className}`}
        />
      </div>
    </label>
  );
}
