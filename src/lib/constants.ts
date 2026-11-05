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

// Tipos selecionáveis numa nova entrada. "Parcelamento cliente" não entra aqui:
// parcelas são geradas automaticamente pela aba Parcelamentos.
export const TIPOS_ENT = [
  "Honorário – processo","Diligência","Aluguel de sala","Outros",
];

// Tipo das entradas geradas pelos parcelamentos (e de entradas antigas lançadas à mão).
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
