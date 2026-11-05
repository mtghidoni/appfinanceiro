import {
  CATS_FIXOS, CATS_VAR, STATUS_PAGO, STATUS_RECEB, TIPOS_ENT, TIPOS_MOV,
} from "@/lib/constants";
import type { ChipTone } from "@/components/ui/MobileItemCard";
import type { Tone } from "@/components/ui/SectionCard";

export type Kind = "entrada" | "fixo" | "variado" | "mov";

interface KindMeta {
  label: string;        // nome no singular (ex: "gasto fixo")
  tone: Tone;
  options: readonly string[];      // categorias / tipos
  optionLabel: string;             // "Categoria" / "Tipo"
  statuses?: readonly string[];
}

export const KINDS: Record<Kind, KindMeta> = {
  entrada: { label: "entrada",       tone: "income",  options: TIPOS_ENT,  optionLabel: "Tipo",      statuses: STATUS_RECEB },
  fixo:    { label: "gasto fixo",    tone: "expense", options: CATS_FIXOS, optionLabel: "Categoria", statuses: STATUS_PAGO },
  variado: { label: "gasto variado", tone: "expense", options: CATS_VAR,   optionLabel: "Categoria", statuses: STATUS_PAGO },
  mov:     { label: "movimentação",  tone: "neutral", options: TIPOS_MOV,  optionLabel: "Tipo" },
};

// Rótulos amigáveis para os status gravados no banco ("OK" vira "Pago"/"Recebido").
export function statusLabel(kind: Kind, s: string): string {
  if (s === "OK") return kind === "entrada" ? "Recebido" : "Pago";
  return s;
}

export function statusTone(s: string): ChipTone {
  return s === "OK" ? "ok" : s === "Pendente" ? "warn" : "bad";
}

/** Alternância de um toque: concluído ↔ pendente (estados de problema vão para concluído). */
export function nextStatus(s: string): "OK" | "Pendente" {
  return s === "OK" ? "Pendente" : "OK";
}
