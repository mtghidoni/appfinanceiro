// Leitura de extratos bancários (OFX e CSV) em transações normalizadas.
// Funções puras, sem dependência do Supabase, para poderem ser testadas isoladamente.

export interface LinhaImportada {
  data: string;               // YYYY-MM-DD
  descricao: string;
  valor: number;              // positivo = entrada, negativo = saída
  external_id: string;        // chave para não importar duas vezes a mesma transação
}

export interface ResultadoOFX {
  linhas: LinhaImportada[];
  saldo: { valor: number; data: string } | null; // saldo informado pelo banco no fim do extrato
}

/** Lê o arquivo como texto: UTF-8 se válido, senão Windows-1252 (comum em bancos brasileiros). */
export async function lerArquivo(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export function ehOFX(texto: string): boolean {
  return /OFXHEADER|<OFX>/i.test(texto.slice(0, 2000));
}

/** Remove acentos, deixa minúsculo e colapsa espaços. */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Converte um valor monetário em número. Aceita "1.234,56", "1,234.56", "-12.5",
 * "R$ -1.234,56", "(123,45)" (negativo) e sufixos "D"/"C" (débito/crédito).
 */
export function parseValor(raw: string): number | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  const sufixo = s.match(/\s*([DC])$/i);
  if (sufixo) { if (sufixo[1].toUpperCase() === "D") neg = true; s = s.slice(0, sufixo.index); }
  s = s.replace(/R\$|\s/gi, "");
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  else if (s.endsWith("-")) { neg = !neg; s = s.slice(0, -1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;

  const ultVirgula = s.lastIndexOf(",");
  const ultPonto = s.lastIndexOf(".");
  if (ultVirgula >= 0 && ultPonto >= 0) {
    // O separador que aparece por último é o decimal.
    s = ultVirgula > ultPonto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (ultVirgula >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, ""); // "1.234.567" → milhar
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.round((neg ? -n : n) * 100) / 100;
}

/** Converte "05/11/2026", "05/11/26", "2026-11-05", "05-11-2026" ou "20261105" em "2026-11-05". */
export function parseData(raw: string): string | null {
  const s = String(raw ?? "").trim();
  let d: number, m: number, y: number;
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/))) {
    d = +r[1]; m = +r[2]; y = +r[3];
    if (y < 100) y += 2000;
  } else if ((r = s.match(/^(\d{4})(\d{2})(\d{2})/))) {
    y = +r[1]; m = +r[2]; d = +r[3];
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null; // ex: 31/02
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Chave estável para linhas sem identificador do banco: data + valor + descrição,
 * com um contador para transações idênticas no mesmo dia (ex: dois cafés de R$ 5).
 */
function comChaves(linhas: Omit<LinhaImportada, "external_id">[], prefixo: string): LinhaImportada[] {
  const vistos = new Map<string, number>();
  return linhas.map(l => {
    const base = `${l.data}|${l.valor.toFixed(2)}|${normalizar(l.descricao)}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    return { ...l, external_id: `${prefixo}:${base}|${n}` };
  });
}

// ---------------------------------------------------------------------------
// OFX
// ---------------------------------------------------------------------------

function campoOFX(bloco: string, tag: string): string {
  const m = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

function decodeEntidades(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export function parseOFX(texto: string): ResultadoOFX {
  const blocos = texto.split(/<STMTTRN>/i).slice(1).map(b => b.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0]);
  const semId: Omit<LinhaImportada, "external_id">[] = [];
  const comId: LinhaImportada[] = [];
  const fitids = new Map<string, number>();

  for (const b of blocos) {
    const data = parseData(campoOFX(b, "DTPOSTED"));
    const valor = parseValor(campoOFX(b, "TRNAMT"));
    if (!data || valor === null) continue;
    const memo = decodeEntidades(campoOFX(b, "MEMO"));
    const name = decodeEntidades(campoOFX(b, "NAME"));
    // Alguns bancos repetem o mesmo texto em NAME e MEMO; outros põem informação diferente.
    const descricao = (memo && name && normalizar(memo) !== normalizar(name) && !normalizar(memo).includes(normalizar(name))
      ? `${name} — ${memo}` : memo || name || "Sem descrição").replace(/\s+/g, " ").trim();
    const fitid = campoOFX(b, "FITID");
    if (fitid) {
      // Há bancos que repetem FITID dentro do arquivo; o contador mantém as linhas distintas.
      const n = (fitids.get(fitid) ?? 0) + 1;
      fitids.set(fitid, n);
      comId.push({ data, descricao, valor, external_id: `ofx:${fitid}${n > 1 ? `#${n}` : ""}` });
    } else {
      semId.push({ data, descricao, valor });
    }
  }

  let saldo: ResultadoOFX["saldo"] = null;
  const ledger = texto.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|<\/CCSTMTRS>|$)/i);
  if (ledger) {
    const v = parseValor(campoOFX(ledger[1], "BALAMT"));
    const d = parseData(campoOFX(ledger[1], "DTASOF"));
    if (v !== null && d) saldo = { valor: v, data: d };
  }

  return { linhas: [...comId, ...comChaves(semId, "ofx")], saldo };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function detectarSeparador(texto: string): string {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim()).slice(0, 10);
  let melhor = ",", maior = 0;
  for (const sep of [";", ",", "\t", "|"]) {
    const contagens = linhas.map(l => l.split(sep).length - 1);
    const min = Math.min(...contagens);
    if (min > maior) { maior = min; melhor = sep; }
  }
  return melhor;
}

/** Lê um CSV (com suporte a aspas) em uma matriz de células, ignorando linhas vazias. */
export function parseCSV(texto: string): string[][] {
  const sep = detectarSeparador(texto);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let aspas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else aspas = false;
      } else cell += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { row.push(cell.trim()); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(x => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(x => x !== "")) rows.push(row);
  return rows;
}

export interface MapeamentoCSV {
  data: number;
  descricao: number;
  valor: number;
  complemento: number;  // coluna extra juntada à descrição (-1 = nenhuma), ex: "Detalhes" do BB
  cabecalho: boolean;   // primeira linha é o nome das colunas
}

/** Tenta descobrir quais colunas são data, descrição e valor (pelo cabeçalho ou pelo conteúdo). */
export function detectarColunas(rows: string[][]): MapeamentoCSV | null {
  if (rows.length === 0) return null;
  const ncol = Math.max(...rows.slice(0, 20).map(r => r.length));
  const amostra = rows.slice(1, 40);

  // Proporção de células de cada coluna que parecem data / número.
  const taxa = (fn: (s: string) => unknown, col: number) =>
    amostra.length ? amostra.filter(r => r[col] && fn(r[col]) !== null).length / amostra.length : 0;
  const ehData = Array.from({ length: ncol }, (_, c) => taxa(parseData, c));
  const ehNum = Array.from({ length: ncol }, (_, c) => taxa(parseValor, c));

  const head = rows[0].map(normalizar);
  const cabecalho = head.every(h => parseValor(h) === null) && head.some(h => parseData(h) === null && h !== "");

  const acha = (re: RegExp, evitar: number[] = []) =>
    cabecalho ? head.findIndex((h, i) => !evitar.includes(i) && re.test(h)) : -1;

  let data = acha(/^(data|date|dt)\b|data (do )?lanc|data mov/);
  if (data < 0) data = ehData.findIndex(t => t >= 0.8);
  let valor = acha(/valor|amount|value|quantia|montante/, [data]);
  if (valor < 0) valor = ehNum.findIndex((t, i) => i !== data && t >= 0.8 && ehData[i] < 0.5);
  let descricao = acha(/descri|historico|lancamento|title|titulo|estabelecimento|memo|detalhe/, [data, valor]);
  if (descricao < 0) {
    // A coluna com o texto médio mais longo que não seja data nem número.
    let maiorMedia = -1;
    for (let c = 0; c < ncol; c++) {
      if (c === data || c === valor || ehNum[c] >= 0.8 || ehData[c] >= 0.8) continue;
      const media = amostra.reduce((s, r) => s + (r[c]?.length ?? 0), 0) / (amostra.length || 1);
      if (media > maiorMedia) { maiorMedia = media; descricao = c; }
    }
  }
  if (data < 0 || valor < 0 || descricao < 0) return null;
  const complemento = acha(/detalhe|complemento|historico|memo|estabelecimento/, [data, valor, descricao]);
  return { data, descricao, valor, complemento, cabecalho };
}

const SALDO = /^(saldo|s a l d o)\b/;

export function linhasDoCSV(
  rows: string[][], map: MapeamentoCSV, inverterSinal: boolean,
): { linhas: LinhaImportada[]; ignoradas: number } {
  const corpo = map.cabecalho ? rows.slice(1) : rows;
  const ok: Omit<LinhaImportada, "external_id">[] = [];
  let ignoradas = 0;
  for (const r of corpo) {
    const data = parseData(r[map.data] ?? "");
    const valor = parseValor(r[map.valor] ?? "");
    const partes = [r[map.descricao], map.complemento >= 0 ? r[map.complemento] : ""]
      .map(p => (p ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const descricao = partes.join(" — ");
    // Linhas de saldo que alguns bancos intercalam no extrato não são transações.
    if (!data || valor === null || valor === 0 || SALDO.test(normalizar(descricao))) { ignoradas++; continue; }
    ok.push({ data, descricao: descricao || "Sem descrição", valor: inverterSinal ? -valor : valor });
  }
  return { linhas: comChaves(ok, "csv"), ignoradas };
}
