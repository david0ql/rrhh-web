import { Plus } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { LoanPayment, LoanPaymentOrderBy, PaginationOrder } from '../api/client';

const TAKE = 10;

const SOURCE_BADGE: Record<LoanPayment['source'], string> = {
  NOMINA:        'badge badge-blue',
  CAJA:          'badge badge-amber',
  TRANSFERENCIA: 'badge badge-gray',
};

type Props = { token: string };

type LoanPaymentsState = {
  payments: LoanPayment[];
  error: string;
  page: number;
  order: PaginationOrder;
  orderBy: LoanPaymentOrderBy;
  totalPages: number;
  totalItems: number;
};

type LoanPaymentsAction =
  | { type: 'dataLoaded'; payments: LoanPayment[]; totalPages: number; totalItems: number }
  | { type: 'loadFailed'; error: string }
  | { type: 'setPage'; page: number }
  | { type: 'setOrder'; order: PaginationOrder }
  | { type: 'setOrderBy'; orderBy: LoanPaymentOrderBy };

const initialState: LoanPaymentsState = {
  payments: [],
  error: '',
  page: 1,
  order: 'DESC',
  orderBy: 'id',
  totalPages: 1,
  totalItems: 0,
};

function reducer(state: LoanPaymentsState, action: LoanPaymentsAction): LoanPaymentsState {
  switch (action.type) {
    case 'dataLoaded':
      return {
        ...state,
        payments: action.payments,
        totalPages: action.totalPages,
        totalItems: action.totalItems,
        error: '',
      };
    case 'loadFailed':
      return { ...state, error: action.error };
    case 'setPage':
      return { ...state, page: action.page };
    case 'setOrder':
      return { ...state, order: action.order };
    case 'setOrderBy':
      return { ...state, orderBy: action.orderBy };
    default:
      return state;
  }
}

export function LoanPaymentsPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.loans
      .listPayments(token, { page: state.page, take: TAKE, order: state.order, orderBy: state.orderBy })
      .then((res) => {
        dispatch({ type: 'dataLoaded', payments: res.data, totalPages: res.meta.totalPages, totalItems: res.meta.totalItems });
      })
      .catch((err) => {
        dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error cargando abonos' });
      });
  }, [token, state.page, state.order, state.orderBy]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-5">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Abonos</h1>
          <p className="text-sm text-muted-foreground">{state.totalItems} abonos en total</p>
        </div>
        <Link to="/loans/payments/new" className="btn-primary">
          <Plus size={14} /> Registrar abono
        </Link>
      </header>

      {state.error ? <p className="text-sm text-red-600 shrink-0">{state.error}</p> : null}

      <div className="card-soft flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-end px-4 py-2.5 border-b shrink-0 gap-2">
          <select className="input-sm" value={state.orderBy} onChange={(e) => dispatch({ type: 'setOrderBy', orderBy: e.target.value as LoanPaymentOrderBy })}>
            <option value="id">ID</option>
            <option value="paymentDate">Fecha</option>
            <option value="amount">Monto</option>
            <option value="source">Fuente</option>
            <option value="createdAt">Creación</option>
          </select>
          <select className="input-sm" value={state.order} onChange={(e) => dispatch({ type: 'setOrder', order: e.target.value as PaginationOrder })}>
            <option value="DESC">↓ Desc</option>
            <option value="ASC">↑ Asc</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr className="text-xs text-muted-foreground font-medium">
                <th className="text-left px-4 py-3">Préstamo</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-center px-4 py-3">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-sm text-muted-foreground">
                    Sin abonos registrados
                  </td>
                </tr>
              ) : state.payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">Préstamo #{p.loanId}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt.date(p.paymentDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt.currency(p.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={SOURCE_BADGE[p.source]}>{p.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t shrink-0">
          <span className="text-xs text-muted-foreground">Página {state.page} de {state.totalPages || 1}</span>
          <div className="flex gap-1.5">
            <button className="btn-secondary" disabled={state.page <= 1} onClick={() => dispatch({ type: 'setPage', page: state.page - 1 })}>Anterior</button>
            <button className="btn-secondary" disabled={state.page >= state.totalPages} onClick={() => dispatch({ type: 'setPage', page: state.page + 1 })}>Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
