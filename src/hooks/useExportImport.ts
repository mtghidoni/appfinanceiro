"use client";

import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { MESES } from "@/lib/constants";
import { mesLabel } from "@/lib/utils";

export function useExportImport() {
  const supabase = createClient();

  type Linha = Record<string, unknown>;

  // O Supabase devolve no máximo 1000 linhas por consulta; busca em páginas.
  // Tabela inexistente (migração da fase 1 não rodada) vira lista vazia.
  async function todas(table: string, order: string[]): Promise<Linha[]> {
    const out: Linha[] = [];
    for (let from = 0; ; from += 1000) {
      let q = supabase.from(table).select("*");
      for (const col of order) q = q.order(col);
      const { data, error } = await q.order("id").range(from, from + 999);
      if (error) break;
      out.push(...((data as Linha[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  }

  async function fetchAll() {
    const [fixos, variados, entradas, movs, parcelas, contas, transacoes] = await Promise.all([
      todas("gastos_fixos", ["mes_ano", "ordem"]),
      todas("gastos_variados", ["mes_ano", "ordem"]),
      todas("entradas", ["mes_ano", "ordem"]),
      todas("movimentacoes", ["mes_ano", "ordem"]),
      todas("parcelamentos", ["created_at"]),
      todas("contas", ["ordem", "created_at"]),
      todas("transacoes", ["data"]),
    ]);
    return { fixos, variados, entradas, movs, parcelas, contas, transacoes };
  }

  async function exportarExcel() {
    const { fixos, variados, entradas, movs, parcelas, contas, transacoes } = await fetchAll();
    const wb = XLSX.utils.book_new();

    const mesSet = new Set([
      ...fixos.map(r => r.mes_ano as string),
      ...variados.map(r => r.mes_ano as string),
      ...entradas.map(r => r.mes_ano as string),
    ]);

    for (const key of Array.from(mesSet).sort()) {
      const [mn, an] = key.split("-");
      const nome = MESES[parseInt(mn) - 1].slice(0, 3) + "-" + an.slice(2);

      const fx = fixos.filter(r => r.mes_ano === key);
      const vr = variados.filter(r => r.mes_ano === key);
      const en = entradas.filter(r => r.mes_ano === key);
      const mv = movs.filter(r => r.mes_ano === key);

      const tFx = fx.reduce((s, r) => s + Number(r.valor), 0);
      const tVr = vr.reduce((s, r) => s + Number(r.valor), 0);
      const tEn = en.reduce((s, r) => s + Number(r.valor), 0);

      const rows: unknown[][] = [];
      rows.push([`${MESES[parseInt(mn) - 1]} / ${an}`, "", "", ""]);
      rows.push([]);
      rows.push(["GASTOS FIXOS", "", "", ""]);
      rows.push(["Descrição", "Categoria", "Valor (R$)", "Status"]);
      fx.forEach(r => rows.push([r.desc, r.cat, Number(r.valor), r.pago]));
      rows.push(["Subtotal", "", tFx, ""]); rows.push([]);
      rows.push(["GASTOS VARIADOS", "", "", ""]);
      rows.push(["Descrição", "Categoria", "Valor (R$)", "Status"]);
      vr.forEach(r => rows.push([r.desc, r.cat, Number(r.valor), r.pago]));
      rows.push(["Subtotal", "", tVr, ""]); rows.push([]);
      rows.push(["ENTRADAS", "", "", ""]);
      rows.push(["Descrição", "Tipo", "Valor (R$)", "Status"]);
      en.forEach(r => rows.push([r.desc, r.parcela ? `${r.tipo} (${r.parcela})` : r.tipo, Number(r.valor), r.recebido]));
      rows.push(["Total Receita Real", "", tEn, ""]); rows.push([]);
      rows.push(["MOVIMENTAÇÕES", "", "", ""]);
      mv.forEach(r => rows.push([r.desc, r.tipo, Number(r.valor), ""]));
      rows.push([]); rows.push(["RESULTADO DO MÊS", "", tEn - tFx - tVr, ""]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, nome);
    }

    // Dashboard
    const dRows: unknown[][] = [["DASHBOARD HISTÓRICO"], []];
    dRows.push(["Mês", "Receita Real", "Total Gastos", "Resultado", "% Gasto/Receita", "Gastos Fixos", "Gastos Variados"]);
    for (const key of Array.from(mesSet).sort()) {
      const rec = entradas.filter(r => r.mes_ano === key).reduce((s, r) => s + Number(r.valor), 0);
      const gfx = fixos.filter(r => r.mes_ano === key).reduce((s, r) => s + Number(r.valor), 0);
      const gvr = variados.filter(r => r.mes_ano === key).reduce((s, r) => s + Number(r.valor), 0);
      dRows.push([mesLabel(key), rec, gfx + gvr, rec - gfx - gvr, rec ? (gfx + gvr) / rec : 0, gfx, gvr]);
    }
    const wd = XLSX.utils.aoa_to_sheet(dRows);
    wd["!cols"] = [{wch:12},{wch:14},{wch:14},{wch:14},{wch:16},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wd, "DASHBOARD");

    // Parcelamentos
    const pRows: unknown[][] = [["CONTROLE DE PARCELAMENTOS"], []];
    pRows.push(["Cliente","Descrição","1ª Parcela","Valor Total","Parcelas","Pagas","Restantes","R$/Parcela","Recebido","A Receber","Situação"]);
    parcelas.forEach(p => {
      const vp = Number(p.valor_total) / (Number(p.num_parcelas) || 1);
      const rst = Math.max(0, Number(p.num_parcelas) - Number(p.parcelas_pagas));
      const ini = p.mes_inicial ? mesLabel(p.mes_inicial as string) : "";
      pRows.push([p.cliente, p.desc, ini, p.valor_total, p.num_parcelas, p.parcelas_pagas, rst, vp, vp * Number(p.parcelas_pagas), vp * rst, p.situacao]);
    });
    const wp = XLSX.utils.aoa_to_sheet(pRows);
    wp["!cols"] = [{wch:22},{wch:22},{wch:11},{wch:14},{wch:10},{wch:10},{wch:10},{wch:14},{wch:14},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wp, "PARCELAMENTOS");

    // Transações das contas
    if (transacoes.length) {
      const nomeConta = new Map(contas.map(c => [c.id as string, c.nome as string]));
      const tRows: unknown[][] = [["TRANSAÇÕES"], []];
      tRows.push(["Data", "Conta", "Descrição", "Categoria", "Valor (R$)", "Observação"]);
      transacoes.forEach(t => {
        const [y, m, d] = String(t.data).split("-");
        tRows.push([`${d}/${m}/${y}`, nomeConta.get(t.conta_id as string) ?? "", t.descricao, t.categoria, Number(t.valor), t.observacao ?? ""]);
      });
      const wt = XLSX.utils.aoa_to_sheet(tRows);
      wt["!cols"] = [{wch:11},{wch:20},{wch:40},{wch:16},{wch:14},{wch:24}];
      XLSX.utils.book_append_sheet(wb, wt, "TRANSAÇÕES");
    }

    XLSX.writeFile(wb, `Controle_Financeiro_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportarJSON() {
    const all = await fetchAll();
    const backup = { version: 3, exportado_em: new Date().toISOString(), ...all };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restaurarJSON(file: File) {
    const text = await file.text();
    const backup = JSON.parse(text);

    const reqs = ["fixos","variados","entradas","movs","parcelas"];
    if (!reqs.every(k => Array.isArray(backup[k]))) throw new Error("Arquivo de backup inválido");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Backup feito em família traz dados de mais de uma pessoa: restaura só os seus.
    const listas: Linha[][] = [backup.fixos, backup.variados, backup.entradas, backup.movs, backup.parcelas,
      backup.contas ?? [], backup.transacoes ?? []];
    const donos = new Set(listas.flat().map(r => r.user_id).filter(Boolean));
    const meus = (rows: Linha[] = []) => (donos.size > 1 ? rows.filter(r => r.user_id === user.id) : rows);
    const contas = meus(backup.contas);
    const idsContas = new Set(contas.map(c => c.id));
    // Transações seguem a conta: entram as das contas restauradas, de quem quer que as tenha lançado.
    const transacoes = ((backup.transacoes ?? []) as Linha[]).filter(t => idsContas.has(t.conta_id));

    await apagarTudo();

    const remap = (rows: Record<string, unknown>[]) =>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      rows.map(({ id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...rest }) => ({
        ...rest, user_id: user.id,
      }));

    // Parcelamentos preservam o id original para que entradas.parcelamento_id continue válido.
    const remapParc = (rows: Record<string, unknown>[]) =>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      rows.map(({ user_id: _uid, created_at: _ca, updated_at: _ua, ...rest }) => ({
        ...rest, user_id: user.id,
      }));

    const fixos = meus(backup.fixos), variados = meus(backup.variados), entradas = meus(backup.entradas);
    const movs = meus(backup.movs), parcelas = meus(backup.parcelas);

    // 1) Parcelamentos e contas primeiro (entradas e transações têm FK para eles); mantêm o id.
    const check = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };
    if (parcelas.length) check(await supabase.from("parcelamentos").insert(remapParc(parcelas)));
    if (contas.length) check(await supabase.from("contas").insert(remapParc(contas)));
    // 2) Demais tabelas. As entradas mantêm parcelamento_id/parcela_num do backup.
    const res = await Promise.all([
      fixos.length    ? supabase.from("gastos_fixos").insert(remap(fixos)) : null,
      variados.length ? supabase.from("gastos_variados").insert(remap(variados)) : null,
      entradas.length ? supabase.from("entradas").insert(remap(entradas)) : null,
      movs.length     ? supabase.from("movimentacoes").insert(remap(movs)) : null,
    ]);
    res.forEach(r => r && check(r));
    for (let i = 0; i < transacoes.length; i += 500) {
      check(await supabase.from("transacoes").insert(remap(transacoes.slice(i, i + 500))));
    }
  }

  async function apagarTudo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from("gastos_fixos").delete().eq("user_id", user.id),
      supabase.from("gastos_variados").delete().eq("user_id", user.id),
      supabase.from("entradas").delete().eq("user_id", user.id),
      supabase.from("movimentacoes").delete().eq("user_id", user.id),
      supabase.from("parcelamentos").delete().eq("user_id", user.id),
      // Apagar a conta apaga as transações dela (ON DELETE CASCADE).
      supabase.from("transacoes").delete().eq("user_id", user.id),
      supabase.from("contas").delete().eq("user_id", user.id),
    ]);
  }

  return { exportarExcel, exportarJSON, restaurarJSON, apagarTudo };
}
