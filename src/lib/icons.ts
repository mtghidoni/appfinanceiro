import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Banknote, Briefcase, Building2, Car, ChartLine,
  CircleEllipsis, CreditCard, Footprints, GraduationCap, HandCoins, HeartPulse, House, Landmark,
  Layers, PartyPopper, PiggyBank, ReceiptText, Repeat, Scale, Shirt, ShoppingCart, Sofa, Sparkles,
  Undo2, UtensilsCrossed, Wallet, type LucideIcon,
} from "lucide-react";
import type { TipoConta } from "@/types";

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
  "Mercado": ShoppingCart,
  "Assinaturas": Repeat,
  "Impostos e taxas": ReceiptText,
  // Categorias de receita das transações
  "Salário": Wallet,
  "Honorários": Scale,
  "Rendimentos": ChartLine,
  "Reembolso": Undo2,
  "Transferência": ArrowLeftRight,
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

const ICONS_CONTA: Record<TipoConta, LucideIcon> = {
  corrente: Landmark,
  poupanca: PiggyBank,
  cartao: CreditCard,
  investimento: ChartLine,
  carteira: Banknote,
  outro: CircleEllipsis,
};

export function iconForConta(tipo: TipoConta): LucideIcon {
  return ICONS_CONTA[tipo] ?? CircleEllipsis;
}
