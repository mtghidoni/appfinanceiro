import { brl } from "@/lib/utils";

interface Props {
  receita: number;
  recebido: number;
  gastos: number;
  pago: number;
}

/** Resumo do mês: saldo em destaque e o andamento de pagamentos/recebimentos. */
export default function MonthSummary({ receita, recebido, gastos, pago }: Props) {
  const saldo = receita - gastos;
  const positive = saldo >= 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div>
        <p className="text-sm font-medium text-muted">Saldo do mês</p>
        <p
          className={`mt-1 text-[34px] md:text-[42px] leading-none font-semibold tracking-tight tabular-nums ${
            positive ? "text-income" : "text-danger"
          }`}
        >
          {positive ? "" : "− "}{brl(Math.abs(saldo))}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          <span className="inline-flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full bg-income" />
            Receitas <strong className="font-semibold text-apptext tabular-nums">{brl(receita)}</strong>
          </span>
          <span className="inline-flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full bg-expense" />
            Gastos <strong className="font-semibold text-apptext tabular-nums">{brl(gastos)}</strong>
          </span>
        </div>
      </div>

      <div className="space-y-4 md:border-l md:border-border md:pl-6">
        <Meter
          label="Gastos pagos"
          done={pago}
          total={gastos}
          barClass="bg-expense"
          rest={gastos - pago > 0 ? `Falta pagar ${brl(gastos - pago)}` : gastos > 0 ? "Tudo pago" : "Sem gastos lançados"}
        />
        <Meter
          label="Receitas recebidas"
          done={recebido}
          total={receita}
          barClass="bg-income"
          rest={receita - recebido > 0 ? `Falta receber ${brl(receita - recebido)}` : receita > 0 ? "Tudo recebido" : "Sem receitas lançadas"}
        />
      </div>
    </section>
  );
}

function Meter({ label, done, total, barClass, rest }: {
  label: string; done: number; total: number; barClass: string; rest: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-apptext">{label}</span>
        <span className="tabular-nums text-muted">
          <span className="font-semibold text-apptext">{pct}%</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 rounded-full bg-thead overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${barClass} transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted tabular-nums">{rest}</p>
    </div>
  );
}
