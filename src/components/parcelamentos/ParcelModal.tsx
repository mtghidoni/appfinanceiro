"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { STATUS_PARC, MESES } from "@/lib/constants";
import { parseBrl, brl, mesKey, parseMesKey, addMonths, mesLabel } from "@/lib/utils";
import { installmentValues } from "@/hooks/useParcelamentos";
import type { Parcelamento, StatusParc } from "@/types";

interface Props {
  open: boolean;
  initial: Parcelamento | null;
  onSave: (payload: Omit<Parcelamento, "id"|"user_id"|"created_at"|"updated_at">) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const now = new Date();
const ANOS = Array.from({ length: 8 }, (_, i) => now.getFullYear() - 3 + i);

export default function ParcelModal({ open, initial, onSave, onDelete, onClose }: Props) {
  const [cliente, setCliente] = useState("");
  const [desc, setDesc] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [numParcelas, setNumParcelas] = useState(1);
  const [parcelasPagas, setParcelasPagas] = useState(0);
  const [situacao, setSituacao] = useState<StatusParc>("Ativo");
  const [mesIni, setMesIni] = useState(MESES[now.getMonth()]);
  const [anoIni, setAnoIni] = useState(now.getFullYear());

  useEffect(() => {
    if (initial) {
      setCliente(initial.cliente);
      setDesc(initial.desc);
      setValorTotal(String(initial.valor_total));
      setNumParcelas(initial.num_parcelas);
      setParcelasPagas(initial.parcelas_pagas);
      setSituacao(initial.situacao);
      if (initial.mes_inicial) {
        const { mes, ano } = parseMesKey(initial.mes_inicial);
        setMesIni(mes); setAnoIni(ano);
      } else {
        setMesIni(MESES[now.getMonth()]); setAnoIni(now.getFullYear());
      }
    } else {
      setCliente(""); setDesc(""); setValorTotal("");
      setNumParcelas(1); setParcelasPagas(0); setSituacao("Ativo");
      setMesIni(MESES[now.getMonth()]); setAnoIni(now.getFullYear());
    }
  }, [initial, open]);

  const n = numParcelas || 1;
  const mesInicialKey = mesKey(mesIni, anoIni);
  const valorPorParcela = installmentValues(parseBrl(valorTotal), n)[0] ?? 0;
  const mesFimKey = addMonths(mesInicialKey, n - 1);

  function handleSave() {
    if (!cliente.trim()) return;
    // Na edição, parcelas_pagas é derivado dos lançamentos mensais — preserva o valor atual.
    // Na criação, o campo serve como "semente" das primeiras parcelas já recebidas.
    const pg = Math.min(initial ? initial.parcelas_pagas : parcelasPagas, n);
    const sit: StatusParc = pg === n && n > 0 ? "Concluído" : situacao;
    onSave({
      cliente: cliente.trim(), desc, valor_total: parseBrl(valorTotal),
      num_parcelas: n, parcelas_pagas: pg, situacao: sit, mes_inicial: mesInicialKey,
    });
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-lg font-semibold text-heading mb-5">{initial ? "Editar Parcelamento" : "Novo Parcelamento"}</h3>
      <div className="space-y-2.5">
        <Row label="Cliente">
          <input value={cliente} onChange={e => setCliente(e.target.value)} className={fieldCls} />
        </Row>
        <Row label="Descrição">
          <input value={desc} onChange={e => setDesc(e.target.value)} className={fieldCls} />
        </Row>
        <Row label="Valor Total">
          <input value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0,00" className={fieldCls} />
        </Row>
        <Row label="Nº Parcelas">
          <input type="number" min={1} value={numParcelas} onChange={e => setNumParcelas(parseInt(e.target.value)||1)} className={fieldCls} />
        </Row>
        <Row label="1ª Parcela em">
          <div className="flex gap-2">
            <select value={mesIni} onChange={e => setMesIni(e.target.value)} className={fieldCls}>
              {MESES.map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={anoIni} onChange={e => setAnoIni(parseInt(e.target.value))} className={fieldCls}>
              {ANOS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </Row>
        {!initial ? (
          <Row label="Já recebidas">
            <input type="number" min={0} max={n} value={parcelasPagas}
              onChange={e => setParcelasPagas(parseInt(e.target.value)||0)} className={fieldCls} />
          </Row>
        ) : (
          <Row label="Recebidas">
            <span className="text-sm text-muted">
              {initial.parcelas_pagas} de {n} — marque nos lançamentos mensais
            </span>
          </Row>
        )}
        <Row label="Situação">
          <select value={situacao} onChange={e => setSituacao(e.target.value as StatusParc)} className={fieldCls}>
            {STATUS_PARC.map(s => <option key={s}>{s}</option>)}
          </select>
        </Row>
      </div>

      {/* Prévia do auto-lançamento */}
      <div className="mt-5 rounded-xl bg-subtotal px-4 py-3 text-[13px] text-apptext space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">Valor por parcela</span>
          <span className="tabular-nums font-semibold">{brl(valorPorParcela)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Lançará</span>
          <span className="font-semibold">{n}× — {mesLabel(mesInicialKey)} até {mesLabel(mesFimKey)}</span>
        </div>
        <p className="text-xs text-muted pt-1 leading-relaxed">
          As {n} parcelas serão lançadas automaticamente como entradas nos respectivos meses.
        </p>
      </div>

      <div className="flex items-center justify-between mt-5">
        {onDelete ? (
          <button onClick={onDelete} className="text-danger hover:bg-danger/10 rounded-full px-3 py-2 text-sm font-semibold transition-colors">
            Remover
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-border rounded-full px-4 py-2 text-sm font-medium hover:bg-thead transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="bg-brand text-onbrand rounded-full px-5 py-2 text-sm font-semibold hover:bg-brand/90 transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] items-center gap-2">
      <label className="text-sm font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

const fieldCls = "border border-border rounded-lg px-3 py-2 font-sans text-sm bg-bg text-apptext outline-none w-full focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card transition";
