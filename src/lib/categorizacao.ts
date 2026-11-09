import { CAT_TRANSFERENCIA } from "./constants";
import { normalizar } from "./importacao";

// Regras por palavra-chave, aplicadas na ordem (a primeira que bater vence).
// Valem só quando não há histórico da mesma descrição.
const REGRAS: [RegExp, string, "entrada" | "saida" | "ambos"][] = [
  [/pagamento (de )?fatura|pgto fatura|pag fatura|fatura cartao|aplicacao|resgate|transf.* mesma titularidade|entre contas/, CAT_TRANSFERENCIA, "ambos"],
  [/salario|folha de pag|pagto salario|proventos/, "Salário", "entrada"],
  [/rendimento|rend pago|juros sobre capital|dividendo|jcp/, "Rendimentos", "entrada"],
  [/estorno|reembolso|cashback|devolucao/, "Reembolso", "entrada"],
  [/honorario/, "Honorários", "entrada"],
  [/iof|tarifa|anuidade|juros|multa|darf|ipva|iptu|imposto|encargo/, "Impostos e taxas", "saida"],
  [/ifood|rappi|restaurante|lanchonete|padaria|burger|pizza|cafe|bar |churrasc|sushi|mcdonald|bk |outback|subway|delivery/, "Alimentação", "saida"],
  [/supermerc|mercado|carrefour|assai|atacad|pao de acucar|hortifruti|sacolao|zaffari|guanabara|dia brasil|oba /, "Mercado", "saida"],
  [/uber|99 ?app|99pop|cabify|posto|shell|ipiranga|petrobras|br mania|combust|estacion|sem parar|veloe|conectcar|pedagio|metro|bilhete unico/, "Transporte", "saida"],
  [/farmac|drogaria|droga ?raia|pacheco|panvel|pague menos|hospital|clinica|laborat|unimed|amil|bradesco saude|sulamerica|odonto|dentista/, "Saúde", "saida"],
  [/netflix|spotify|prime video|amazon prime|disney|hbo|max\.com|youtube|apple\.com|icloud|google (one|storage)|deezer|globoplay|paramount|chatgpt|openai|claude/, "Assinaturas", "saida"],
  [/aluguel|condominio|enel|light s|cemig|copel|celesc|coelba|sabesp|cedae|copasa|comgas|naturgy|energia|agua e esgoto|internet|vivo|claro|tim |oi fibra/, "Moradia", "saida"],
  [/escola|colegio|faculdade|universidade|curso|udemy|alura|livraria/, "Educação", "saida"],
  [/cinema|ingresso|teatro|show|steam|playstation|xbox|viagem|hotel|airbnb|booking|decolar|latam|gol linhas|azul linhas/, "Lazer", "saida"],
  [/renner|riachuelo|c&a|cea |zara|shein|centauro|netshoes|hering|calcados/, "Vestuário", "saida"],
  [/salao|barbearia|cabeleir|estetica|manicure|boticario|natura|sephora/, "Beleza", "saida"],
  [/leroy|telhanorte|tok ?stok|magalu|magazine luiza|casas bahia|mobly|camicado/, "Casa", "saida"],
];

/** Descrição reduzida ao "nome do estabelecimento": sem números, datas e pontuação. */
export function chaveDescricao(descricao: string): string {
  return normalizar(descricao)
    .replace(/\d+/g, " ")
    .replace(/[^a-z& ]/g, " ")
    .replace(/\b(pix|compra|debito|credito|cartao|pagamento|pgto|parcela|parc|de|da|do|em|no|na)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sugere a categoria de uma transação: primeiro pelo histórico da família
 * (mesma descrição já categorizada antes), depois pelas regras de palavra-chave.
 */
export function sugerirCategoria(descricao: string, valor: number, historico: Map<string, string>): string {
  const chave = chaveDescricao(descricao);
  const aprendida = chave && historico.get(chave);
  if (aprendida) return aprendida;
  const texto = normalizar(descricao) + " ";
  const sentido = valor >= 0 ? "entrada" : "saida";
  for (const [re, cat, quando] of REGRAS) {
    if ((quando === "ambos" || quando === sentido) && re.test(texto)) return cat;
  }
  return "Outros";
}

/** Monta o histórico (descrição → categoria) a partir de transações já existentes, mais recentes por último. */
export function montarHistorico(rows: { descricao: string; categoria: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    if (!r.categoria || r.categoria === "Outros") continue;
    const k = chaveDescricao(r.descricao);
    if (k) m.set(k, r.categoria);
  }
  return m;
}
