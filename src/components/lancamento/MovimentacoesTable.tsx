"use client";

import { Info, PiggyBank } from "lucide-react";
import { brl, parseBrl, fmtInput } from "@/lib/utils";
import { TIPOS_MOV } from "@/lib/constants";
import type { Movimentacao, TipoMov } from "@/types";
import MobileItemCard, { CardField, FIELD_CLS, FIELD_MONO_CLS } from "@/components/ui/MobileItemCard";
import SectionCard, { ColumnHeader, EmptyRow } from "@/components/ui/SectionCard";
import { CELL_CLS, SELECT_CELL_CLS, NUM_CELL_CLS, ROW_CLS, DeleteButton } from "./cells";

interface Props {
  rows: Movimentacao[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Movimentacao, value: unknown) => void;
  onDelete: (id: string) => void;
}

const COLS = "grid-cols-[2fr_1.2fr_1fr_32px]";

export default function MovimentacoesTable({ rows, onAdd, onUpdate, onDelete }: Props) {
  return (
    <SectionCard
      icon={PiggyBank}
      tone="neutral"
      title="Movimentações de reserva"
      meta={
        <span className="inline-flex items-center gap-1">
          <Info size={12} className="shrink-0" />
          Não entram no cálculo do saldo do mês
        </span>
      }
      onAdd={onAdd}
    >
      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <ColumnHeader cols={COLS} labels={["Descrição", "Tipo", "Valor", ""]} right={[2]} />
        {rows.length === 0 && <EmptyRow>Nenhuma movimentação neste mês.</EmptyRow>}
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
              key={"t" + row.tipo}
              defaultValue={row.tipo}
              onChange={e => onUpdate(row.id, "tipo", e.target.value as TipoMov)}
              className={SELECT_CELL_CLS}
            >
              {TIPOS_MOV.map(t => <option key={t}>{t}</option>)}
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
            <DeleteButton onClick={() => onDelete(row.id)} />
          </div>
        ))}
      </div>

      {/* Mobile: lista com itens expansíveis e swipe para excluir */}
      <div className="md:hidden divide-y divide-border">
        {rows.length === 0 && <EmptyRow>Nenhuma movimentação neste mês.</EmptyRow>}
        {rows.map(row => (
          <MobileItemCard
            key={row.id}
            title={row.desc}
            subtitle={row.tipo}
            value={brl(Number(row.valor))}
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
            <CardField label="Tipo">
              <select
                key={"t" + row.tipo}
                defaultValue={row.tipo}
                onChange={e => onUpdate(row.id, "tipo", e.target.value as TipoMov)}
                className={FIELD_CLS}
              >
                {TIPOS_MOV.map(t => <option key={t}>{t}</option>)}
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
          </MobileItemCard>
        ))}
      </div>
    </SectionCard>
  );
}
