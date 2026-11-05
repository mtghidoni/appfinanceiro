import { MESES } from "./constants";

export function mesKey(mes: string, ano: number): string {
  return String(MESES.indexOf(mes) + 1).padStart(2, "0") + "-" + ano;
}

export function parseMesKey(key: string): { mes: string; ano: number } {
  const [mn, an] = key.split("-");
  return { mes: MESES[parseInt(mn) - 1], ano: parseInt(an) };
}

export function mesLabel(key: string): string {
  const [mn, an] = key.split("-");
  return MESES[parseInt(mn) - 1].slice(0, 3) + "/" + an.slice(2);
}

// Soma n meses (n pode ser negativo) a uma chave "MM-YYYY" e devolve outra "MM-YYYY".
export function addMonths(key: string, n: number): string {
  const [mn, an] = key.split("-").map(Number);
  const total = (an * 12 + (mn - 1)) + n;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return String(mes).padStart(2, "0") + "-" + ano;
}

export function brl(value: number): string {
  return "R$ " + value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Valor para preencher um campo de edição (ex: 1234.5 → "1.234,50"); vazio quando zero.
export function fmtInput(value: number): string {
  return value > 0 ? brl(Number(value)).replace("R$ ", "") : "";
}

export function parseBrl(s: string | number | null | undefined): number {
  if (typeof s === "number") return s;
  const str = String(s ?? "").trim().replace("R$", "").replace(/\s/g, "");
  let cleaned = str;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
