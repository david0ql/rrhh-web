import { Pencil, Plus } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { Employee, EmployeeOrderBy, PaginationOrder } from '../api/client';

const TAKE = 10;
const DOC_TYPES = ['CC', 'CE', 'TI', 'PAS', 'NIT', 'PPT'];

type EditForm = {
  fullName: string; documentType: string; documentNumber: string;
  jobTitle: string; baseSalary: number; email: string; hiredAt: string; isActive: boolean;
};

const emptyEdit: EditForm = {
  fullName: '', documentType: 'CC', documentNumber: '',
  jobTitle: '', baseSalary: 0, email: '',
  hiredAt: new Date().toISOString().slice(0, 10), isActive: true,
};

type Props = { token: string };

type EmployeesState = {
  items: Employee[];
  error: string;
  page: number;
  order: PaginationOrder;
  orderBy: EmployeeOrderBy;
  filter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  totalPages: number;
  totalItems: number;
  editId: number | null;
  editForm: EditForm;
  saving: boolean;
};

type EmployeesAction =
  | { type: 'dataLoaded'; items: Employee[]; totalPages: number; totalItems: number }
  | { type: 'loadFailed'; error: string }
  | { type: 'setPage'; page: number }
  | { type: 'setOrder'; order: PaginationOrder }
  | { type: 'setOrderBy'; orderBy: EmployeeOrderBy }
  | { type: 'setFilter'; filter: 'ALL' | 'ACTIVE' | 'INACTIVE' }
  | { type: 'startEdit'; editId: number; editForm: EditForm }
  | { type: 'cancelEdit' }
  | { type: 'editFieldChanged'; field: keyof EditForm; value: EditForm[keyof EditForm] }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; error: string }
  | { type: 'submitSucceeded' };

const initialState: EmployeesState = {
  items: [],
  error: '',
  page: 1,
  order: 'DESC',
  orderBy: 'id',
  filter: 'ALL',
  totalPages: 1,
  totalItems: 0,
  editId: null,
  editForm: emptyEdit,
  saving: false,
};

function reducer(state: EmployeesState, action: EmployeesAction): EmployeesState {
  switch (action.type) {
    case 'dataLoaded':
      return { ...state, items: action.items, totalPages: action.totalPages, totalItems: action.totalItems, error: '' };
    case 'loadFailed':
      return { ...state, error: action.error };
    case 'setPage':
      return { ...state, page: action.page };
    case 'setOrder':
      return { ...state, order: action.order };
    case 'setOrderBy':
      return { ...state, orderBy: action.orderBy };
    case 'setFilter':
      return { ...state, filter: action.filter, page: 1 };
    case 'startEdit':
      return { ...state, editId: action.editId, editForm: action.editForm, error: '' };
    case 'cancelEdit':
      return { ...state, editId: null, editForm: emptyEdit, error: '' };
    case 'editFieldChanged':
      return { ...state, editForm: { ...state.editForm, [action.field]: action.value } };
    case 'submitStarted':
      return { ...state, error: '', saving: true };
    case 'submitFailed':
      return { ...state, error: action.error, saving: false };
    case 'submitSucceeded':
      return { ...state, saving: false };
    default:
      return state;
  }
}

export function EmployeesPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'loadFailed', error: '' });
    api.employees
      .list(token, {
        page: state.page,
        take: TAKE,
        order: state.order,
        orderBy: state.orderBy,
        isActive: state.filter === 'ALL' ? undefined : state.filter === 'ACTIVE',
      })
      .then((res) => {
        dispatch({ type: 'dataLoaded', items: res.data, totalPages: res.meta.totalPages, totalItems: res.meta.totalItems });
      })
      .catch((err) => {
        dispatch({ type: 'loadFailed', error: err instanceof Error ? err.message : 'Error cargando empleados' });
      });
  }, [token, state.page, state.order, state.orderBy, state.filter]);

  function startEdit(emp: Employee) {
    dispatch({
      type: 'startEdit',
      editId: Number(emp.id),
      editForm: {
        fullName: emp.fullName,
        documentType: emp.documentType,
        documentNumber: emp.documentNumber,
        jobTitle: emp.jobTitle,
        baseSalary: Number(emp.baseSalary),
        email: emp.email ?? '',
        hiredAt: emp.hiredAt,
        isActive: Boolean(emp.isActive),
      },
    });
  }

  function cancelEdit() {
    dispatch({ type: 'cancelEdit' });
  }

  function setEditField<K extends keyof EditForm>(field: K, value: EditForm[K]) {
    dispatch({ type: 'editFieldChanged', field, value });
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!state.editId) return;
    dispatch({ type: 'submitStarted' });
    try {
      await api.employees.update(token, state.editId, {
        fullName: state.editForm.fullName,
        documentType: state.editForm.documentType,
        documentNumber: state.editForm.documentNumber,
        jobTitle: state.editForm.jobTitle,
        baseSalary: Number(state.editForm.baseSalary),
        email: state.editForm.email || undefined,
        hiredAt: state.editForm.hiredAt,
        isActive: Boolean(state.editForm.isActive),
      });
      dispatch({ type: 'submitSucceeded' });
      cancelEdit();
    } catch (err) {
      dispatch({ type: 'submitFailed', error: err instanceof Error ? err.message : 'Error actualizando empleado' });
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-5">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Empleados</h1>
          <p className="text-sm text-muted-foreground">{state.totalItems} registros en total</p>
        </div>
        <Link to="/employees/create" className="btn-primary">
          <Plus size={14} /> Crear empleado
        </Link>
      </header>

      {state.error ? <p className="text-sm text-red-600 shrink-0">{state.error}</p> : null}

      {state.editId ? (
        <form className="card-soft p-5 space-y-4 shrink-0" onSubmit={submitEdit}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Editar empleado #{state.editId}</h2>
            <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancelar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="field md:col-span-2">
              <label htmlFor="emp-fullname" className="field-label">Nombre completo</label>
              <input id="emp-fullname" className="input" value={state.editForm.fullName} onChange={(e) => setEditField('fullName', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="emp-doctype" className="field-label">Tipo doc.</label>
              <select id="emp-doctype" className="input" value={state.editForm.documentType} onChange={(e) => setEditField('documentType', e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="emp-docnum" className="field-label">Número doc.</label>
              <input id="emp-docnum" className="input" value={state.editForm.documentNumber} onChange={(e) => setEditField('documentNumber', e.target.value)} required />
            </div>
            <div className="field md:col-span-2">
              <label htmlFor="emp-job" className="field-label">Cargo</label>
              <input id="emp-job" className="input" value={state.editForm.jobTitle} onChange={(e) => setEditField('jobTitle', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="emp-salary" className="field-label">Salario base</label>
              <input id="emp-salary" className="input" type="number" min={0} value={state.editForm.baseSalary} onChange={(e) => setEditField('baseSalary', Number(e.target.value))} required />
            </div>
            <div className="field">
              <label htmlFor="emp-hired" className="field-label">Contratación</label>
              <input id="emp-hired" className="input" type="date" value={state.editForm.hiredAt} onChange={(e) => setEditField('hiredAt', e.target.value)} required />
            </div>
            <div className="field md:col-span-2">
              <label htmlFor="emp-email" className="field-label">Correo (opcional)</label>
              <input id="emp-email" className="input" type="email" value={state.editForm.email} onChange={(e) => setEditField('email', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="emp-active" className="field-label">Estado</label>
              <select id="emp-active" className="input" value={String(state.editForm.isActive)} onChange={(e) => setEditField('isActive', e.target.value === 'true')}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={state.saving}>
            <Pencil size={13} /> {state.saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      ) : null}

      <div className="card-soft flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 gap-2">
          <select className="input-sm" value={state.filter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE' })}>
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
          <div className="flex items-center gap-2">
            <select className="input-sm" value={state.orderBy} onChange={(e) => dispatch({ type: 'setOrderBy', orderBy: e.target.value as EmployeeOrderBy })}>
              <option value="id">ID</option>
              <option value="fullName">Nombre</option>
              <option value="hiredAt">Ingreso</option>
              <option value="baseSalary">Salario</option>
              <option value="createdAt">Creación</option>
            </select>
            <select className="input-sm" value={state.order} onChange={(e) => dispatch({ type: 'setOrder', order: e.target.value as PaginationOrder })}>
              <option value="DESC">↓ Desc</option>
              <option value="ASC">↑ Asc</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr className="text-xs text-muted-foreground font-medium">
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Documento</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-left px-4 py-3">Ingreso</th>
                <th className="text-right px-4 py-3">Salario base</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm text-muted-foreground">
                    Sin empleados registrados
                  </td>
                </tr>
              ) : state.items.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{emp.documentType} {emp.documentNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.jobTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt.date(emp.hiredAt)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{fmt.currency(emp.baseSalary)}</td>
                  <td className="px-4 py-3 text-center">
                    {emp.isActive
                      ? <span className="badge badge-green">Activo</span>
                      : <span className="badge badge-gray">Inactivo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost" onClick={() => startEdit(emp)}>
                      <Pencil size={12} /> Editar
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
