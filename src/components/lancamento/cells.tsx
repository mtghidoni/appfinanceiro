import { X } from "lucide-react";
import { CHIP_TONES, toneForPago } from "@/components/ui/MobileItemCard";

// Campos da tabela desktop: parecem texto até receber hover/foco, em vez de uma grade de caixas.
export const CELL_CLS =
  "rounded-lg px-2.5 py-1.5 text-sm bg-transparent text-apptext w-full outline-none border border-transparent hover:border-border focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20 transition placeholder:text-muted/70";
export const SELECT_CELL_CLS = CELL_CLS + " cursor-pointer";
export const NUM_CELL_CLS = CELL_CLS + " tabular-nums text-right";

export const ROW_CLS = "group grid px-5 py-1.5 items-center gap-2 border-b border-border last:border-0 hover:bg-rowhover transition-colors";

/** Classes do seletor de status em formato de "pílula" colorida. */
export function statusSelectCls(status: string) {
  return `appearance-none cursor-pointer rounded-full px-3 py-1 text-xs font-semibold text-center outline-none border border-transparent focus:ring-2 focus:ring-accent/30 justify-self-start ${CHIP_TONES[toneForPago(status)]}`;
}

export function DeleteButton({ onClick, label = "Excluir" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="size-8 grid place-items-center rounded-lg text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger hover:bg-danger/10 transition"
    >
      <X size={16} />
    </button>
  );
}
