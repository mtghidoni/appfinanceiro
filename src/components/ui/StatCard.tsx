import type { LucideIcon } from "lucide-react";
import { TONE_CHIP, type Tone } from "./SectionCard";

interface Props {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

export default function StatCard({ icon: Icon, tone, label, value, sub, valueClass = "text-heading" }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`size-7 shrink-0 grid place-items-center rounded-lg ${TONE_CHIP[tone]}`}>
          <Icon size={15} strokeWidth={2.25} />
        </span>
        <span className="text-[13px] font-medium text-muted truncate">{label}</span>
      </div>
      <span className={`text-xl md:text-[22px] font-semibold tabular-nums tracking-tight truncate ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-muted -mt-1">{sub}</span>}
    </div>
  );
}
