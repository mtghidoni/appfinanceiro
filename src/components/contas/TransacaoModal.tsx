"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { CATS_TRANSACAO } from "@/lib/constants";
import { fmtInput } from "@/lib/utils";
import { parseValor } from "@/lib/importacao";
import type { ContaComSaldo, Transacao } from "@/types";
import type { NovaTransacao } from "@/hooks/useContas";
import { BTN_PRIMARY, FIELD, Field, MoneyInput, Segmented } from "./form";

interface Props {
  open: boolean;
  initial: Transacao | null;
  contas: ContaComSaldo[];
  contaPadrao?: string;
  onSave: (t: NovaTransacao) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

type Sentido = "saida" | "entrada";

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ORIGEM: Record<Transacao["origem"], string> = {
  manual: "Lançada à mão",
  importacao: "Importada de extrato",
  pluggy: "Sincronizada com o banco",
};

export default function TransacaoModal({ open, initial, contas, contaPadrao, onSave, onDelete, onClose }: Props) {
  const [sentido, setSentido] = useState<Sentido>("saida");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje());
  const [contaId, setContaId] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  const ativas = contas.filter(c => !c.arquivada || c.id === initial?.conta_id);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    if (initial) {
      setSentido(initial.valor >= 0 ? "entrada" : "saida");
      setValor(fmtInput(Math.abs(initial.valor)));
      setDescricao(initial.descricao);
      setData(initial.data);
      setContaId(initial.conta_id);
      setCategoria(initial.categoria);
      setObservacao(initial.observacao ?? "");
    } else {
      setSentido("saida"); setValor(""); setDescricao(""); setData(hoje());
      setContaId(contaPadrao ?? contas.find(c => !c.arquivada)?.id ?? "");
      setCategoria("Outros"); setObservacao("");
      setTimeout(() => valorRef.current?.focus(), 60);
    }
  }, [open, initial, contaPadrao, contas]);

  const v = Math.abs(parseValor(valor) ?? 0);
  const canSave = v > 0 && !!contaId && !!data && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        conta_id: contaId, data, descricao: descricao.trim(),
        valor: sentido === "saida" ? -v : v,
        categoria, observacao: observacao.trim(),
        origem: initial?.origem ?? "manual",
        external_id: initial?.external_id ?? null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Editar transação" : "Nova transação"} width="480px">
      <form onSubmit={submit} className="space-y-5">
        <Segmented
          value={sentido}
          onChange={setSentido}
          label="Tipo de transação"
          options={[
            { v: "saida", label: "Saída", activeClass: "bg-card text-expense" },
            { v: "entrada", label: "Entrada", activeClass: "bg-card text-income" },
          ]}
        />

        <MoneyInput label="Valor" value={valor} onChange={setValor} inputRef={valorRef}
          className={sentido === "entrada" ? "text-income" : ""} />

        <Field label="Descrição">
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Mercado do mês" className={FIELD} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Data">
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={FIELD} required />
          </Field>
          <Field label="Conta">
            <select value={contaId} onChange={e => setContaId(e.target.value)} className={FIELD}>
              {ativas.length === 0 && <option value="">Cadastre uma conta antes</option>}
              {ativas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Categoria"
          hint={categoria === "Transferência" ? "Transferências não contam como receita nem gasto (ex: pagar a fatura, mover dinheiro entre contas)." : undefined}>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={FIELD}>
            {CATS_TRANSACAO.map(c => <option key={c} value={c}>{c}</option>)}
            {!CATS_TRANSACAO.includes(categoria) && <option value={categoria}>{categoria}</option>}
          </select>
        </Field>

        <Field label="Observação">
          <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" className={FIELD} />
        </Field>

        {initial && <p className="text-xs text-muted">{ORIGEM[initial.origem]}</p>}

        <div className="flex items-center gap-2 pt-1">
          {onDelete && (
            <button type="button" onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 transition-colors">
              <Trash2 size={16} />
              Excluir
            </button>
          )}
          <button type="submit" disabled={!canSave} className={`ml-auto flex-1 sm:flex-none ${BTN_PRIMARY}`}>
            {saving ? "Salvando…" : initial ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
