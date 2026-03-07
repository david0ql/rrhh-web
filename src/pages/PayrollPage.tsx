import { FileDown, Plus } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { PaginationOrder, PayrollOrderBy, PayrollRecord } from '../api/client';

const TAKE = 10;

type Props = { token: string };

type PayrollState = {
  records: PayrollRecord[];
  selectedIds: number[];
  error: string;
  page: number;
  order: PaginationOrder;
  orderBy: PayrollOrderBy;
  totalPages: number;
  totalItems: number;
};

type PayrollAction =
  | { type: 'dataLoaded'; records: PayrollRecord[]; totalPages: number; totalItems: number }
  | { type: 'loadFailed'; error: string }
  | { type: 'setPage'; page: number }
  | { type: 'setOrder'; order: PaginationOrder }
  | { type: 'setOrderBy'; orderBy: PayrollOrderBy }
  | { type: 'toggleSelected'; id: number }
  | { type: 'toggleSelectPage' }
  | { type: 'clearSelection' }
  | { type: 'clearError' };

const initialState: PayrollState = {
  records: [],
  selectedIds: [],
  error: '',
  page: 1,
  order: 'DESC',
  orderBy: 'id',
  totalPages: 1,
  totalItems: 0,
};

function reducer(state: PayrollState, action: PayrollAction): PayrollState {
  switch (action.type) {
    case 'dataLoaded':
      const pageRecordIds = action.records.map((r) => Number(r.id));
      const selectedIds = state.selectedIds.filter((id) => pageRecordIds.includes(id));
      return {
        ...state,
        records: action.records,
        selectedIds,
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
    case 'toggleSelected':
      return state.selectedIds.includes(action.id)
        ? { ...state, selectedIds: state.selectedIds.filter((id) => id !== action.id) }
        : { ...state, selectedIds: [...state.selectedIds, action.id] };
    case 'toggleSelectPage': {
      const pageIds = state.records.map((r) => Number(r.id));
      const allSelected = pageIds.length > 0 && pageIds.every((id) => state.selectedIds.includes(id));
      return {
        ...state,
        selectedIds: allSelected ? state.selectedIds.filter((id) => !pageIds.includes(id)) : [...new Set([...state.selectedIds, ...pageIds])],
      };
    }
    case 'clearSelection':
      return { ...state, selectedIds: [] };
    case 'clearError':
      return { ...state, error: '' };
    default:
      return state;
  }
}

export function PayrollPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'clearError' });
    api.payroll
      .list(token, { page: state.page, take: TAKE, order: state.order, orderBy: state.orderBy })
      .then((res) => {
        dispatch({ type: 'dataLoaded', records: res.data, totalPages: res.meta.totalPages, totalItems: res.meta.totalItems });
      })
      .catch((err) => {
        dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error cargando nóminas' });
      });
  }, [token, state.page, state.order, state.orderBy]);

  async function downloadPdf(id: number) {
    try {
      const blob = await api.payroll.pdf(token, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nomina-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error generando PDF' });
    }
  }

  async function downloadSelectedZip() {
    if (state.selectedIds.length === 0) {
      dispatch({ type: 'loadFailed', error: 'Selecciona al menos una nómina' });
      return;
    }
    try {
      const blob = await api.payroll.pdfZip(token, state.selectedIds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nominas-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      dispatch({ type: 'clearSelection' });
    } catch (err) {
      dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error generando ZIP' });
    }
  }

  const pageIds = state.records.map((r) => Number(r.id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => state.selectedIds.includes(id));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-5">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Nómina</h1>
          <p className="text-sm text-muted-foreground">{state.totalItems} liquidaciones en total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={state.selectedIds.length === 0}
            onClick={() => void downloadSelectedZip()}
          >
            <FileDown size={14} /> Descargar ZIP ({state.selectedIds.length})
          </button>
          <Link to="/payroll/create" className="btn-primary">
            <Plus size={14} /> Crear nómina
          </Link>
        </div>
      </header>

      {state.error ? <p className="text-sm text-red-600 shrink-0">{state.error}</p> : null}

      <div className="card-soft flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-end px-4 py-2.5 border-b shrink-0 gap-2">
          <select className="input-sm" value={state.orderBy} onChange={(e) => dispatch({ type: 'setOrderBy', orderBy: e.target.value as PayrollOrderBy })}>
            <option value="id">ID</option>
            <option value="year">Año</option>
            <option value="month">Mes</option>
            <option value="netPay">Neto</option>
            <option value="paymentDate">Pago</option>
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
                <th className="text-center px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => dispatch({ type: 'toggleSelectPage' })}
                    aria-label="Seleccionar todas las nóminas de la página"
                  />
                </th>
                <th className="text-left px-4 py-3">Empleado</th>
                <th className="text-left px-4 py-3">Período</th>
                <th className="text-right px-4 py-3">Devengado</th>
                <th className="text-right px-4 py-3">Deducciones</th>
                <th className="text-right px-4 py-3">Neto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm text-muted-foreground">
                    Sin registros de nómina
                  </td>
                </tr>
              ) : state.records.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={state.selectedIds.includes(Number(r.id))}
                      onChange={() => dispatch({ type: 'toggleSelected', id: Number(r.id) })}
                      aria-label={`Seleccionar nómina ${r.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm">{r.employeeName ?? `#${r.employeeId}`}</span>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">{fmt.period(r.year, r.month)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt.currency(r.totalEarnings)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt.currency(r.totalDeductions)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt.currency(r.netPay)}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      className="btn-ghost px-2"
                      title="Descargar comprobante PDF"
                      onClick={() => void downloadPdf(Number(r.id))}
                    >
                      <FileDown size={14} />
                    </button>
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
