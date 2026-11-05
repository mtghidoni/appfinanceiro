"use client";

import { House } from "lucide-react";
import { brl, parseBrl, fmtInput } from "@/lib/utils";
import { CATS_FIXOS, STATUS_PAGO } from "@/lib/constants";
import type { GastoFixo, StatusPago } from "@/types";
import MobileItemCard, { CardField, FIELD_CLS, FIELD_MONO_CLS, toneForPago } from "@/components/ui/MobileItemCard";
import SectionCard, { ColumnHeader, EmptyRow } from "@/components/ui/SectionCard";
import { CELL_CLS, SELECT_CELL_CLS, NUM_CELL_CLS, ROW_CLS, statusSelectCls, DeleteButton } from "./cells";

interface Props {
  rows: GastoFixo[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof GastoFixo, value: unknown) => void;
  onDelete: (id: string) => void;
}

const COLS = "grid-cols-[2fr_1.2fr_1fr_.9fr_32px]";

export default function GastosFixosTable({ rows, onAdd, onUpdate, onDelete }: Props) {
  const subtotal = rows.reduce((s, it) => s + Number(it.valor), 0);
  const pagos = rows.filter(r => r.pago === "OK").length;

  function cyclePago(row: GastoFixo) {
    const next = STATUS_PAGO[(STATUS_PAGO.indexOf(row.pago) + 1) % STATUS_PAGO.length];
    onUpdate(row.id, "pago", next);
  }

  return (
    <SectionCard
      icon={House}
      tone="expense"
      title="Gastos fixos"
      meta={rows.length ? `${pagos} de ${rows.length} pagos` : "Nenhum item"}
      total={brl(subtotal)}
      onAdd={onAdd}
    >
      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <ColumnHeader cols={COLS} labels={["Descrição", "Categoria", "Valor", "Situação", ""]} right={[2]} />
        {rows.length === 0 && <EmptyRow>Nenhum gasto fixo neste mês.</EmptyRow>}
        {rows.map(row => (
          <div key={row.id} className={`${ROW_CLS} ${COLS}`}>
            <input
              key={"d" + row.desc}
              type="text"
              placeholder="Descrição"
              defaultValue={row.desc}
              onBlur={e => onUpdate(row.id, "desc", e.target.value)}
              className={CELL_CLS}
            />
            <select
              key={"c" + row.cat}
              defaultValue={row.cat}
              onChange={e => onUpdate(row.id, "cat", e.target.value)}
              className={SELECT_CELL_CLS}
            >
              {CATS_FIXOS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              key={"v" + row.valor}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={fmtInput(Number(row.valor))}
              onBlur={e => onUpdate(row.id, "valor", parseBrl(e.target.value))}
              className={NUM_CELL_CLS}
            />
            <select
              key={"p" + row.pago}
              defaultValue={row.pago}
              onChange={e => onUpdate(row.id, "pago", e.target.value as StatusPago)}
              className={statusSelectCls(row.pago)}
              aria-label="Situação do pagamento"
            >
              {STATUS_PAGO.map(s => <option key={s}>{s}</option>)}
            </select>
            <DeleteButton onClick={() => onDelete(row.id)} />
          </div>
        ))}
      </div>

      {/* Mobile: lista com itens expansíveis e swipe para excluir */}
      <div className="md:hidden divide-y divide-border">
        {rows.length === 0 && <EmptyRow>Nenhum gasto fixo neste mês.</EmptyRow>}
        {rows.map(row => (
          <MobileItemCard
            key={row.id}
            title={row.desc}
            subtitle={row.cat}
            value={brl(Number(row.valor))}
            chip={row.pago}
            chipTone={toneForPago(row.pago)}
            onChipTap={() => cyclePago(row)}
            onDelete={() => onDelete(row.id)}
          >
            <CardField label="Descrição">
              <input
                key={"d" + row.desc}
                type="text"
                placeholder="Descrição"
                defaultValue={row.desc}
                onBlur={e => onUpdate(row.id, "desc", e.target.value)}
                className={FIELD_CLS}
              />
            </CardField>
            <CardField label="Categoria">
              <select
                key={"c" + row.cat}
                defaultValue={row.cat}
                onChange={e => onUpdate(row.id, "cat", e.target.value)}
                className={FIELD_CLS}
              >
                {CATS_FIXOS.map(c => <option key={c}>{c}</option>)}
              </select>
            </CardField>
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
                key={"p" + row.pago}
                defaultValue={row.pago}
                onChange={e => onUpdate(row.id, "pago", e.target.value as StatusPago)}
                className={FIELD_CLS}
              >
                {STATUS_PAGO.map(s => <option key={s}>{s}</option>)}
              </select>
            </CardField>
          </MobileItemCard>
        ))}
      </div>
    </SectionCard>
  );
}
