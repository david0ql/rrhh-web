import { Plus } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { Loan, LoanOrderBy, PaginationOrder } from '../api/client';

const TAKE = 10;

const STATUS_BADGE: Record<Loan['status'], string> = {
  ACTIVO:    'badge badge-green',
  PAGADO:    'badge badge-blue',
  CANCELADO: 'badge badge-gray',
};

type Props = { token: string };

type LoansState = {
  loans: Loan[];
  error: string;
  page: number;
  order: PaginationOrder;
  orderBy: LoanOrderBy;
  totalPages: number;
  totalItems: number;
  loading: boolean;
};

type LoansAction =
  | { type: 'dataLoaded'; loans: Loan[]; totalPages: number; totalItems: number }
  | { type: 'loadFailed'; error: string }
  | { type: 'setPage'; page: number }
  | { type: 'setOrder'; order: PaginationOrder }
  | { type: 'setOrderBy'; orderBy: LoanOrderBy };

const initialState: LoansState = {
  loans: [],
  error: '',
  page: 1,
  order: 'DESC',
  orderBy: 'id',
  totalPages: 1,
  totalItems: 0,
  loading: false,
};

function reducer(state: LoansState, action: LoansAction): LoansState {
  switch (action.type) {
    case 'dataLoaded':
      return {
        ...state,
        loans: action.loans,
        totalPages: action.totalPages,
        totalItems: action.totalItems,
        error: '',
        loading: false,
      };
    case 'loadFailed':
      return { ...state, error: action.error, loading: false };
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

export function LoansOverviewPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'loadFailed', error: '' });
    api.loans
      .list(token, { page: state.page, take: TAKE, order: state.order, orderBy: state.orderBy })
      .then((res) => {
        dispatch({ type: 'dataLoaded', loans: res.data, totalPages: res.meta.totalPages, totalItems: res.meta.totalItems });
      })
      .catch((err) => dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error cargando préstamos' }));
  }, [token, state.page, state.order, state.orderBy]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-5">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Préstamos</h1>
          <p className="text-sm text-muted-foreground">{state.totalItems} préstamos en total</p>
        </div>
        <Link to="/loans/create" className="btn-primary">
          <Plus size={14} /> Crear préstamo
        </Link>
      </header>

      {state.error ? <p className="text-sm text-red-600 shrink-0">{state.error}</p> : null}

      <div className="card-soft flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-end px-4 py-2.5 border-b shrink-0 gap-2">
          <select className="input-sm" value={state.orderBy} onChange={(e) => dispatch({ type: 'setOrderBy', orderBy: e.target.value as LoanOrderBy })}>
            <option value="id">ID</option>
            <option value="startDate">Inicio</option>
            <option value="principalAmount">Monto</option>
            <option value="paidAmount">Pagado</option>
            <option value="balance">Saldo</option>
            <option value="status">Estado</option>
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
                <th className="text-left px-4 py-3">Empleado</th>
                <th className="text-left px-4 py-3">Inicio</th>
                <th className="text-right px-4 py-3">Capital</th>
                <th className="text-right px-4 py-3">Pagado</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-center px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                    Sin préstamos registrados
                  </td>
                </tr>
              ) : state.loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{loan.employeeName ?? `#${loan.employeeId}`}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt.date(loan.startDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt.currency(loan.principalAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt.currency(loan.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt.currency(loan.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={STATUS_BADGE[loan.status]}>{loan.status}</span>
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
