import {
  ArrowDownToLine, ArrowUpFromLine, Briefcase, Building2, Car, CircleEllipsis, Footprints,
  GraduationCap, HandCoins, HeartPulse, House, Layers, PartyPopper, Scale, Shirt, Sofa,
  Sparkles, UtensilsCrossed, type LucideIcon,
} from "lucide-react";

// Ícone de cada categoria/tipo usado nas listas e no editor.
const ICONS: Record<string, LucideIcon> = {
  // Categorias de gastos
  "Moradia": House,
  "Saúde": HeartPulse,
  "Profissional": Briefcase,
  "Educação": GraduationCap,
  "Transporte": Car,
  "Alimentação": UtensilsCrossed,
  "Beleza": Sparkles,
  "Vestuário": Shirt,
  "Lazer": PartyPopper,
  "Casa": Sofa,
  // Tipos de entrada
  "Honorário – processo": Scale,
  "Diligência": Footprints,
  "Parcelamento cliente": Layers,
  "Aluguel de sala": Building2,
  // Tipos de movimentação
  "Retirada da reserva": ArrowUpFromLine,
  "Depósito na reserva": ArrowDownToLine,
  "Aporte externo": HandCoins,
};

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? CircleEllipsis;
}
