import { Activity, BanknoteArrowDown, Users } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import { api, fmt } from '../api/client';
import type { DashboardSummary } from '../api/client';

type Props = { token: string };

type State = {
  summary: DashboardSummary | null;
  error: string;
  loading: boolean;
};

type Action =
  | { type: 'loadSucceeded'; summary: DashboardSummary }
  | { type: 'loadFailed'; error: string };

const initialState: State = {
  summary: null,
  error: '',
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loadSucceeded':
      return { ...state, summary: action.summary, error: '', loading: false };
    case 'loadFailed':
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="card-soft p-5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </article>
  );
}

export function DashboardPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.dashboardSummary(token)
      .then((summary) => dispatch({ type: 'loadSucceeded', summary }))
      .catch((err) => dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error cargando dashboard' }));
  }, [token]);

  const period = state.summary?.payroll.latestPeriod
    ? fmt.period(state.summary.payroll.latestPeriod.year, state.summary.payroll.latestPeriod.month)
    : 'Sin datos';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <header>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del sistema.</p>
      </header>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Empleados activos"
          value={state.summary ? String(state.summary.employees.active) : '—'}
          sub={`${state.summary?.employees.total ?? '—'} en total · ${state.summary?.employees.inactive ?? '—'} inactivos`}
        />
        <Stat
          label={`Nómina neta · ${period}`}
          value={state.summary ? fmt.currency(state.summary.payroll.latestTotals.netPay) : '—'}
          sub={`Devengado ${state.summary ? fmt.currency(state.summary.payroll.latestTotals.totalEarnings) : '—'} · Ded. ${state.summary ? fmt.currency(state.summary.payroll.latestTotals.totalDeductions) : '—'}`}
        />
        <Stat
          label="Saldo préstamos activos"
          value={state.summary ? fmt.currency(state.summary.loans.activeBalance) : '—'}
          sub={`${state.summary?.loans.activeCount ?? '—'} préstamos activos`}
        />
      </section>

      <section className="card-soft p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Registros globales</p>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Users size={15} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{state.summary?.employees.total ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Empleados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Activity size={15} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{state.summary?.payroll.records ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Liquidaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <BanknoteArrowDown size={15} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{state.summary?.loans.activeCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Préstamos activos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
