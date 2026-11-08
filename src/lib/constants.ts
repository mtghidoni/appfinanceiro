export const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export const CATS_FIXOS = [
  "Moradia","Saúde","Profissional","Educação","Transporte","Alimentação","Outros",
];

export const CATS_VAR = [
  "Alimentação","Beleza","Vestuário","Saúde","Lazer","Profissional","Educação","Casa","Transporte","Outros",
];

export const TIPOS_ENT = [
  "Honorário – processo","Diligência","Parcelamento cliente","Aluguel de sala","Outros",
];

// Tipo de entrada que habilita o campo de parcela (ex: "5/10")
export const TIPO_PARCELAMENTO = "Parcelamento cliente";

export const TIPOS_MOV = [
  "Retirada da reserva","Depósito na reserva","Aporte externo",
] as const;

export const STATUS_PAGO = ["OK","Pendente","Não pagou"] as const;
export const STATUS_RECEB = ["OK","Pendente","Inadimplente"] as const;
export const STATUS_PARC = ["Ativo","Concluído","Inadimplente","Suspenso"] as const;

export const FIXOS_PADRAO = [
  { desc: "Aluguel",          cat: "Moradia",      valor: 0, pago: "Pendente" },
  { desc: "Condomínio",       cat: "Moradia",      valor: 0, pago: "Pendente" },
  { desc: "Água / Gás",       cat: "Moradia",      valor: 0, pago: "Pendente" },
  { desc: "Energia elétrica", cat: "Moradia",      valor: 0, pago: "Pendente" },
  { desc: "Internet",         cat: "Moradia",      valor: 0, pago: "Pendente" },
  { desc: "Plano de saúde",   cat: "Saúde",        valor: 0, pago: "Pendente" },
  { desc: "OAB – anuidade",   cat: "Profissional", valor: 0, pago: "Pendente" },
  { desc: "OAB – previdência",cat: "Profissional", valor: 0, pago: "Pendente" },
  { desc: "Inglês",           cat: "Educação",     valor: 0, pago: "Pendente" },
  { desc: "Personal / Academia", cat: "Saúde",     valor: 0, pago: "Pendente" },
] as const;

// --- Contas ---
export const TIPOS_CONTA = [
  { v: "corrente",     label: "Conta corrente" },
  { v: "poupanca",     label: "Poupança" },
  { v: "cartao",       label: "Cartão de crédito" },
  { v: "investimento", label: "Investimento" },
  { v: "carteira",     label: "Dinheiro" },
  { v: "outro",        label: "Outra" },
] as const;

// Categoria que não conta como receita nem gasto (dinheiro mudando de conta, pagamento de fatura).
export const CAT_TRANSFERENCIA = "Transferência";

// Categorias das transações: as de gastos do app + as de receita.
export const CATS_TRANSACAO = [
  "Alimentação","Mercado","Moradia","Transporte","Saúde","Educação","Lazer","Vestuário",
  "Beleza","Casa","Assinaturas","Profissional","Impostos e taxas",
  "Salário","Honorários","Rendimentos","Reembolso",
  CAT_TRANSFERENCIA,"Outros",
];
