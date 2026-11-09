export type StatusPago = "OK" | "Pendente" | "Não pagou";
export type StatusRecebido = "OK" | "Pendente" | "Inadimplente";
export type StatusParc = "Ativo" | "Concluído" | "Inadimplente" | "Suspenso";
export type TipoMov = "Retirada da reserva" | "Depósito na reserva" | "Aporte externo";

export interface GastoFixo {
  id: string;
  user_id: string;
  mes_ano: string;
  desc: string;
  cat: string;
  valor: number;
  pago: StatusPago;
  ordem: number;
}

export interface GastoVariado {
  id: string;
  user_id: string;
  mes_ano: string;
  desc: string;
  cat: string;
  valor: number;
  pago: StatusPago;
  ordem: number;
}

export interface Entrada {
  id: string;
  user_id: string;
  mes_ano: string;
  desc: string;
  tipo: string;
  valor: number;
  recebido: StatusRecebido;
  parcela: string; // ex: "5/10" — usado quando tipo = "Parcelamento cliente"
  parcelamento_id: string | null; // vínculo ao parcelamento que gerou esta parcela
  parcela_num: number | null;     // número da parcela (1..N) dentro do parcelamento
  ordem: number;
}

export interface Movimentacao {
  id: string;
  user_id: string;
  mes_ano: string;
  desc: string;
  tipo: TipoMov;
  valor: number;
  ordem: number;
}

export interface Parcelamento {
  id: string;
  user_id: string;
  cliente: string;
  desc: string;
  valor_total: number;
  num_parcelas: number;
  parcelas_pagas: number;
  situacao: StatusParc;
  mes_inicial: string; // "MM-YYYY" — mês da 1ª parcela; base do auto-lançamento
  created_at: string;
  updated_at: string;
}

export interface MesData {
  gastos_fixos: GastoFixo[];
  gastos_variados: GastoVariado[];
  entradas: Entrada[];
  movimentacoes: Movimentacao[];
}

// --- Família ---
export interface Familia {
  id: string;
  nome: string;
  codigo_convite: string;
  created_by: string | null;
  created_at: string;
}

export interface MembroFamilia {
  familia_id: string;
  user_id: string;
  nome: string;
  created_at: string;
}

// --- Contas e transações ---
export type TipoConta = "corrente" | "poupanca" | "cartao" | "investimento" | "carteira" | "outro";
export type OrigemTransacao = "manual" | "importacao" | "pluggy";

export interface Conta {
  id: string;
  user_id: string;         // dono da conta
  nome: string;
  instituicao: string;
  tipo: TipoConta;
  saldo_inicial: number;
  arquivada: boolean;
  origem: "manual" | "pluggy";
  external_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/** Linha da view contas_saldo: a conta com o saldo calculado. */
export interface ContaComSaldo extends Conta {
  saldo: number;
  ultima_data: string | null; // data da transação mais recente (YYYY-MM-DD)
}

export interface Transacao {
  id: string;
  user_id: string;
  conta_id: string;
  data: string;        // YYYY-MM-DD
  descricao: string;
  valor: number;       // positivo = entrada, negativo = saída
  categoria: string;
  observacao: string;
  origem: OrigemTransacao;
  external_id: string | null;
  created_at: string;
}
