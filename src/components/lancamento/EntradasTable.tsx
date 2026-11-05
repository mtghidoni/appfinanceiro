"use client";

import { Link2, Lock, TrendingUp } from "lucide-react";
import { brl, parseBrl, fmtInput } from "@/lib/utils";
import { TIPOS_ENT, STATUS_RECEB, TIPO_PARCELAMENTO } from "@/lib/constants";
import type { Entrada, StatusRecebido } from "@/types";
import MobileItemCard, { CardField, FIELD_CLS, FIELD_MONO_CLS, toneForPago } from "@/components/ui/MobileItemCard";
import SectionCard, { ColumnHeader, EmptyRow } from "@/components/ui/SectionCard";
import { CELL_CLS, SELECT_CELL_CLS, NUM_CELL_CLS, ROW_CLS, statusSelectCls, DeleteButton } from "./cells";

interface Props {
  rows: Entrada[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Entrada, value: unknown) => void;
  onDelete: (id: string) => void;
}

const COLS = "grid-cols-[1.8fr_1.3fr_.6fr_1fr_.9fr_32px]";
const LINKED_HINT = "Gerado pelo parcelamento — edite na aba Parcelamentos";

export default function EntradasTable({ rows, onAdd, onUpdate, onDelete }: Props) {
  const subtotal = rows.reduce((s, it) => s + Number(it.valor), 0);
  const recebidas = rows.filter(r => r.recebido === "OK").length;

  function cycleRecebido(row: Entrada) {
    const next = STATUS_RECEB[(STATUS_RECEB.indexOf(row.recebido) + 1) % STATUS_RECEB.length];
    onUpdate(row.id, "recebido", next);
  }

  return (
    <SectionCard
      icon={TrendingUp}
      tone="income"
      title="Entradas"
      meta={rows.length ? `${recebidas} de ${rows.length} recebidas` : "Receita do trabalho"}
      total={brl(subtotal)}
      onAdd={onAdd}
    >
      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <ColumnHeader cols={COLS} labels={["Cliente / descrição", "Tipo", "Parcela", "Valor", "Situação", ""]} right={[3]} />
        {rows.length === 0 && <EmptyRow>Nenhuma entrada neste mês. Use “Adicionar” para registrar.</EmptyRow>}
        {rows.map(row => {
          const linked = !!row.parcelamento_id;
          return (
            <div key={row.id} className={`${ROW_CLS} ${COLS}`}>
              {linked ? (
                <span className="flex items-center gap-1.5 px-2.5 text-sm truncate" title={LINKED_HINT}>
                  <Link2 size={14} className="text-brand shrink-0" />
                  <span className="truncate">{row.desc}</span>
                </span>
              ) : (
                <input
                  key={"d" + row.desc}
                  type="text"
                  placeholder="Cliente / descrição"
                  defaultValue={row.desc}
                  onBlur={e => onUpdate(row.id, "desc", e.target.value)}
                  className={CELL_CLS}
                />
              )}
              {linked ? (
                <span className="px-2.5 text-sm text-muted truncate">{row.tipo}</span>
              ) : (
                <select
                  key={"t" + row.tipo}
                  defaultValue={row.tipo}
                  onChange={e => onUpdate(row.id, "tipo", e.target.value)}
                  className={SELECT_CELL_CLS}
                >
                  {TIPOS_ENT.map(t => <option key={t}>{t}</option>)}
                </select>
              )}
              {linked ? (
                <span className="text-center text-sm tabular-nums">{row.parcela}</span>
              ) : row.tipo === TIPO_PARCELAMENTO ? (
                <input
                  key={"pc" + row.parcela}
                  type="text"
                  placeholder="5/10"
                  defaultValue={row.parcela ?? ""}
                  onBlur={e => onUpdate(row.id, "parcela", e.target.value)}
                  className={NUM_CELL_CLS + " !text-center"}
                />
              ) : (
                <span className="text-center text-sm text-muted/60 select-none">—</span>
              )}
              {linked ? (
                <span className="px-2.5 text-right text-sm tabular-nums">{brl(Number(row.valor))}</span>
              ) : (
                <input
                  key={"v" + row.valor}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  defaultValue={fmtInput(Number(row.valor))}
                  onBlur={e => onUpdate(row.id, "valor", parseBrl(e.target.value))}
                  className={NUM_CELL_CLS}
                />
              )}
              <select
                key={"r" + row.recebido}
                defaultValue={row.recebido}
                onChange={e => onUpdate(row.id, "recebido", e.target.value as StatusRecebido)}
                className={statusSelectCls(row.recebido)}
                aria-label="Situação do recebimento"
              >
                {STATUS_RECEB.map(s => <option key={s}>{s}</option>)}
              </select>
              {linked ? (
                <span className="size-8 grid place-items-center text-muted/60 cursor-not-allowed" title="Remova na aba Parcelamentos">
                  <Lock size={14} />
                </span>
              ) : (
                <DeleteButton onClick={() => onDelete(row.id)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: lista com itens expansíveis e swipe para excluir */}
      <div className="md:hidden divide-y divide-border">
        {rows.length === 0 && <EmptyRow>Nenhuma entrada neste mês. Toque em + para registrar.</EmptyRow>}
        {rows.map(row => {
          const linked = !!row.parcelamento_id;
          const isParc = row.tipo === TIPO_PARCELAMENTO;
          const subtitle = (isParc || linked) && row.parcela
            ? `${row.tipo} · ${row.parcela}`
            : row.tipo;
          return (
            <MobileItemCard
              key={row.id}
              title={row.desc}
              titlePlaceholder="Sem cliente / descrição"
              subtitle={subtitle}
              value={brl(Number(row.valor))}
              chip={row.recebido}
              chipTone={toneForPago(row.recebido)}
              onChipTap={() => cycleRecebido(row)}
              onDelete={() => onDelete(row.id)}
              disableDelete={linked}
              badge={linked ? <Link2 size={14} className="text-brand shrink-0" aria-label="Gerado por parcelamento" /> : undefined}
            >
              {linked ? (
                <>
                  <div className="flex gap-2 text-[13px] text-muted bg-card border border-border rounded-lg px-3 py-2.5 leading-relaxed">
                    <Link2 size={15} className="text-brand shrink-0 mt-0.5" />
                    <span>Parcela gerada automaticamente pelo parcelamento. Para alterar valor, descrição ou nº de parcelas, edite na aba <strong className="text-apptext font-semibold">Parcelamentos</strong>.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <CardStat label="Parcela" value={row.parcela} />
                    <CardStat label="Valor" value={brl(Number(row.valor))} />
                  </div>
                  <CardField label="Situação">
                    <select
                      key={"r" + row.recebido}
                      defaultValue={row.recebido}
                      onChange={e => onUpdate(row.id, "recebido", e.target.value as StatusRecebido)}
                      className={FIELD_CLS}
                    >
                      {STATUS_RECEB.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </CardField>
                </>
              ) : (
                <>
                  <CardField label="Cliente / descrição">
                    <input
                      key={"d" + row.desc}
                      type="text"
                      placeholder="Cliente / descrição"
                      defaultValue={row.desc}
                      onBlur={e => onUpdate(row.id, "desc", e.target.value)}
                      className={FIELD_CLS}
                    />
                  </CardField>
                  <CardField label="Tipo">
                    <select
                      key={"t" + row.tipo}
                      defaultValue={row.tipo}
                      onChange={e => onUpdate(row.id, "tipo", e.target.value)}
                      className={FIELD_CLS}
                    >
                      {TIPOS_ENT.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </CardField>
                  {isParc && (
                    <CardField label="Parcela (ex: 5/10)">
                      <input
                        key={"pc" + row.parcela}
                        type="text"
                        placeholder="5/10"
                        defaultValue={row.parcela ?? ""}
                        onBlur={e => onUpdate(row.id, "parcela", e.target.value)}
                        className={FIELD_MONO_CLS}
                      />
                    </CardField>
                  )}
                  <CardField label="Valor (R$)">
                    <input
                      key={"v" + row.valor}
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      defaultValue={fmtInput(Number(row.valor))}
                      onBlur={e => onUpdate(row.id, "valor", parseBrl(e.target.value))}
                      className={FIELD_MONO_CLS}
                    />
                  </CardField>
                  <CardField label="Situação">
                    <select
                      key={"r" + row.recebido}
                      defaultValue={row.recebido}
                      onChange={e => onUpdate(row.id, "recebido", e.target.value as StatusRecebido)}
                      className={FIELD_CLS}
                    >
                      {STATUS_RECEB.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </CardField>
                </>
              )}
            </MobileItemCard>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="tabular-nums text-sm font-semibold">{value}</span>
    </div>
  );
}
