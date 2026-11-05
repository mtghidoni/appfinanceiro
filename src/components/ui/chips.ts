export type ChipTone = "ok" | "warn" | "bad" | "info" | "neutral";

/** Cores das "pílulas" de status (fundo suave + texto escuro do mesmo tom). */
export const CHIP_TONES: Record<ChipTone, string> = {
  ok:      "bg-success-soft text-success-ink",
  warn:    "bg-warning-soft text-warning-ink",
  bad:     "bg-danger-soft text-danger-ink",
  info:    "bg-info-soft text-info-ink",
  neutral: "bg-thead text-muted",
};
