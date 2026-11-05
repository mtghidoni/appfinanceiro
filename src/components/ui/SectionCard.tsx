import { Plus, type LucideIcon } from "lucide-react";

export type Tone = "brand" | "income" | "expense" | "neutral";

export const TONE_CHIP: Record<Tone, string> = {
  brand:   "bg-brand/10 text-brand",
  income:  "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  neutral: "bg-thead text-muted",
};

interface Props {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  meta?: React.ReactNode;
  total?: string;
  onAdd?: () => void;
  children: React.ReactNode;
}

/** Bloco de lista com cabeçalho (ícone, título, total) — substitui as faixas coloridas de planilha. */
export default function SectionCard({ icon: Icon, tone, title, meta, total, onAdd, children }: Props) {
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden isolate">
      <header className="flex items-center gap-3 px-4 md:px-5 py-3.5">
        <span className={`size-9 shrink-0 grid place-items-center rounded-xl ${TONE_CHIP[tone]}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-heading leading-tight">{title}</h2>
          {meta && <div className="text-xs text-muted mt-0.5 truncate">{meta}</div>}
        </div>
        {total && (
          <span className="text-[15px] font-semibold text-heading tabular-nums whitespace-nowrap">{total}</span>
        )}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Adicionar em ${title}`}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand hover:bg-brand/15 active:scale-95 transition px-2.5 md:px-3 py-1.5 text-[13px] font-semibold"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        )}
      </header>
      <div className="border-t border-border">{children}</div>
    </section>
  );
}

/** Cabeçalho de colunas da tabela (desktop). */
export function ColumnHeader({ cols, labels, right = [] }: { cols: string; labels: string[]; right?: number[] }) {
  return (
    <div className={`grid ${cols} gap-2 px-5 py-2 bg-thead/60 border-b border-border`}>
      {labels.map((h, i) => (
        <span key={i} className={`text-xs font-medium text-muted px-2.5 ${right.includes(i) ? "text-right" : ""}`}>{h}</span>
      ))}
    </div>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-sm text-muted text-center">{children}</div>;
}
