"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, RefreshCw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { brl } from "@/lib/utils";
import {
  detectarColunas, ehOFX, lerArquivo, linhasDoCSV, parseCSV, parseOFX,
  type LinhaImportada, type MapeamentoCSV, type ResultadoOFX,
} from "@/lib/importacao";
import type { ContaComSaldo } from "@/types";
import type { LinhaCategorizada } from "@/hooks/useContas";
import { BTN_PRIMARY, FIELD, Field } from "./form";

interface Props {
  open: boolean;
  contas: ContaComSaldo[];
  contaPadrao?: string;
  preparar: (contaId: string, linhas: LinhaImportada[]) => Promise<{ novas: LinhaCategorizada[]; duplicadas: number }>;
  onImport: (contaId: string, linhas: LinhaCategorizada[], saldo: ResultadoOFX["saldo"]) => Promise<void>;
  onClose: () => void;
}

const fmtData = (iso: string) => iso.split("-").reverse().join("/");

export default function ImportModal({ open, contas, contaPadrao, preparar, onImport, onClose }: Props) {
  const ativas = contas.filter(c => !c.arquivada);
  const [contaId, setContaId] = useState("");
  const [arquivo, setArquivo] = useState<string>("");
  const [ofx, setOfx] = useState<ResultadoOFX | null>(null);
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [map, setMap] = useState<MapeamentoCSV | null>(null);
  const [inverter, setInverter] = useState(false);
  const [atualizarSaldo, setAtualizarSaldo] = useState(true);
  const [preview, setPreview] = useState<{ novas: LinhaCategorizada[]; duplicadas: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const conta = contas.find(c => c.id === contaId);

  useEffect(() => {
    if (!open) return;
    setContaId(contaPadrao ?? ativas[0]?.id ?? "");
    setArquivo(""); setOfx(null); setCsv(null); setMap(null);
    setInverter(false); setAtualizarSaldo(true); setPreview(null); setErro(null); setBusy(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { linhas, ignoradas } = useMemo((): { linhas: LinhaImportada[]; ignoradas: number } => {
    if (ofx) return { linhas: ofx.linhas, ignoradas: 0 };
    if (csv && map) return linhasDoCSV(csv, map, inverter);
    return { linhas: [], ignoradas: 0 };
  }, [ofx, csv, map, inverter]);

  // Confere duplicatas e sugere categorias sempre que as linhas ou a conta mudam.
  useEffect(() => {
    if (!contaId || linhas.length === 0) { setPreview(null); return; }
    let cancel = false;
    preparar(contaId, linhas)
      .then(p => { if (!cancel) setPreview(p); })
      .catch(e => { if (!cancel) setErro((e as Error).message); });
    return () => { cancel = true; };
  }, [contaId, linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null); setPreview(null); setOfx(null); setCsv(null); setMap(null);
    setArquivo(file.name);
    try {
      const texto = await lerArquivo(file);
      if (ehOFX(texto)) {
        const r = parseOFX(texto);
        if (r.linhas.length === 0) throw new Error("Nenhuma transação encontrada no arquivo OFX.");
        setOfx(r);
      } else {
        const rows = parseCSV(texto);
        const m = detectarColunas(rows);
        if (!m) throw new Error("Não consegui identificar as colunas de data, descrição e valor. Confira se o arquivo é um extrato em CSV.");
        setCsv(rows); setMap(m);
        // Faturas de cartão em CSV costumam trazer as compras como valores positivos.
        if (conta?.tipo === "cartao") {
          const r = linhasDoCSV(rows, m, false).linhas;
          setInverter(r.filter(l => l.valor > 0).length > r.length / 2);
        }
      }
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  async function confirmar() {
    if (!preview || !contaId) return;
    setBusy(true);
    try {
      await onImport(contaId, preview.novas, ofx?.saldo && atualizarSaldo ? ofx.saldo : null);
    } catch (e) {
      setErro((e as Error).message);
      setBusy(false);
    }
  }

  const novas = preview?.novas ?? [];
  const entradas = novas.filter(l => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const saidas = novas.filter(l => l.valor < 0).reduce((s, l) => s - l.valor, 0);
  const datas = linhas.map(l => l.data).sort();
  const colunas = csv ? Math.max(...csv.slice(0, 20).map(r => r.length)) : 0;
  const nomeColuna = (i: number) => (map?.cabecalho && csv?.[0][i]) || `Coluna ${i + 1}`;

  return (
    <Modal open={open} onClose={onClose} title="Importar extrato" width="560px">
      <div className="space-y-5">
        <Field label="Conta">
          <select value={contaId} onChange={e => setContaId(e.target.value)} className={FIELD}>
            {ativas.length === 0 && <option value="">Cadastre uma conta antes</option>}
            {ativas.map(c => <option key={c.id} value={c.id}>{c.nome}{c.instituicao ? ` · ${c.instituicao}` : ""}</option>)}
          </select>
        </Field>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-accent hover:bg-brand/5 px-4 py-4 text-left transition-colors"
        >
          <span className="size-10 shrink-0 grid place-items-center rounded-xl bg-brand/10 text-brand">
            {arquivo ? <RefreshCw size={18} /> : <FileUp size={18} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-medium truncate">{arquivo || "Escolher arquivo"}</span>
            <span className="block text-[13px] text-muted">
              {arquivo ? "Toque para trocar" : "OFX (recomendado) ou CSV, baixado do app ou site do banco"}
            </span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept=".ofx,.qfx,.csv,.txt,text/csv" className="hidden" onChange={onFile} />

        {erro && <p className="rounded-xl bg-danger-soft text-danger-ink px-4 py-3 text-sm">{erro}</p>}

        {/* Ajuste das colunas do CSV */}
        {csv && map && (
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <p className="text-sm font-semibold text-heading">Colunas do arquivo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([["data", "Data"], ["valor", "Valor"], ["descricao", "Descrição"], ["complemento", "Complemento"]] as const).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="block text-xs font-medium text-muted mb-1">{label}</span>
                  <select
                    value={map[k]}
                    onChange={e => setMap({ ...map, [k]: Number(e.target.value) })}
                    className={FIELD + " py-2 text-sm"}
                  >
                    {k === "complemento" && <option value={-1}>Nenhuma</option>}
                    {Array.from({ length: colunas }, (_, i) => <option key={i} value={i}>{nomeColuna(i)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={map.cabecalho} onChange={e => setMap({ ...map, cabecalho: e.target.checked })} className="size-4" />
              A primeira linha é o nome das colunas
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={inverter} onChange={e => setInverter(e.target.checked)} className="size-4" />
              Inverter sinais (compras vêm positivas, como em faturas de cartão)
            </label>
          </div>
        )}

        {/* Resumo */}
        {linhas.length > 0 && (
          <div className="rounded-2xl bg-thead px-4 py-3.5 space-y-3">
            {preview ? (
              <>
                <div>
                  <p className="text-[15px] font-semibold">
                    {novas.length} {novas.length === 1 ? "transação nova" : "transações novas"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {datas.length > 0 && `${fmtData(datas[0])} a ${fmtData(datas[datas.length - 1])}`}
                    {preview.duplicadas > 0 && ` · ${preview.duplicadas} já importadas antes (serão puladas)`}
                    {ignoradas > 0 && ` · ${ignoradas} linhas sem data/valor ignoradas`}
                  </p>
                </div>
                {novas.length > 0 && (
                  <>
                    <div className="flex gap-5 text-sm">
                      <span>Entradas <strong className="font-semibold text-income tabular-nums">{brl(entradas)}</strong></span>
                      <span>Saídas <strong className="font-semibold text-expense tabular-nums">{brl(saidas)}</strong></span>
                    </div>
                    <ul className="divide-y divide-border rounded-xl bg-card border border-border overflow-hidden">
                      {novas.slice(0, 6).map(l => (
                        <li key={l.external_id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                          <span className="text-muted tabular-nums shrink-0">{fmtData(l.data).slice(0, 5)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block truncate">{l.descricao}</span>
                            <span className="block text-xs text-muted">{l.categoria}</span>
                          </span>
                          <span className={`tabular-nums font-semibold shrink-0 ${l.valor > 0 ? "text-income" : ""}`}>
                            {l.valor > 0 ? "+" : "−"}{brl(Math.abs(l.valor))}
                          </span>
                        </li>
                      ))}
                      {novas.length > 6 && <li className="px-3 py-2 text-xs text-muted">e mais {novas.length - 6}…</li>}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Conferindo o extrato…</p>
            )}

            {ofx?.saldo && (
              <label className="flex items-start gap-2.5 text-sm pt-1">
                <input type="checkbox" checked={atualizarSaldo} onChange={e => setAtualizarSaldo(e.target.checked)} className="size-4 mt-0.5" />
                <span>
                  Ajustar o saldo da conta para <strong className="tabular-nums">{brl(ofx.saldo.valor)}</strong>
                  <span className="text-muted"> (saldo informado pelo banco em {fmtData(ofx.saldo.data)})</span>
                </span>
              </label>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <p className="text-xs text-muted flex-1">As categorias são sugeridas automaticamente e você pode corrigir depois. O app aprende com as correções.</p>
          <button
            type="button"
            onClick={confirmar}
            disabled={!preview || busy || (novas.length === 0 && !(ofx?.saldo && atualizarSaldo))}
            className={`shrink-0 ${BTN_PRIMARY}`}
          >
            {busy ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
