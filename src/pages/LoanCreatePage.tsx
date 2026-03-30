import { HandCoins } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { Employee, Loan } from '../api/client';

type Props = { token: string };

type LoanForm = {
  employeeId: number;
  startDate: string;
  principalAmount: number;
  suggestedInstallmentAmount: number;
  notes: string;
};

type State = {
  employees: Employee[];
  loan: Loan | null;
  error: string;
  saving: boolean;
  loadingEmployees: boolean;
  loadingLoan: boolean;
  form: LoanForm;
};

type Action =
  | { type: 'employeesLoaded'; employees: Employee[] }
  | { type: 'employeesLoadFailed'; error: string }
  | { type: 'loanLoadStarted' }
  | { type: 'loanLoaded'; loan: Loan }
  | { type: 'loanLoadFailed'; error: string }
  | { type: 'formFieldChanged'; field: keyof LoanForm; value: LoanForm[keyof LoanForm] }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; error: string }
  | { type: 'submitSucceeded' };

const initialState: State = {
  employees: [],
  loan: null,
  error: '',
  saving: false,
  loadingEmployees: true,
  loadingLoan: false,
  form: {
    employeeId: 0,
    startDate: new Date().toISOString().slice(0, 10),
    principalAmount: 0,
    suggestedInstallmentAmount: 0,
    notes: '',
  },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'employeesLoaded': {
      const firstId = action.employees.length > 0 ? Number(action.employees[0].id) : 0;
      return {
        ...state,
        employees: action.employees,
        loadingEmployees: false,
        form: {
          ...state.form,
          employeeId: state.form.employeeId || firstId,
        },
      };
    }
    case 'employeesLoadFailed':
      return { ...state, error: action.error, loadingEmployees: false };
    case 'loanLoadStarted':
      return { ...state, error: '', loadingLoan: true };
    case 'loanLoaded':
      return {
        ...state,
        loan: action.loan,
        loadingLoan: false,
        form: {
          employeeId: Number(action.loan.employeeId),
          startDate: action.loan.startDate,
          principalAmount: Number(action.loan.principalAmount),
          suggestedInstallmentAmount: Number(action.loan.suggestedInstallmentAmount ?? 0),
          notes: action.loan.notes ?? '',
        },
      };
    case 'loanLoadFailed':
      return { ...state, error: action.error, loadingLoan: false };
    case 'formFieldChanged':
      return { ...state, form: { ...state.form, [action.field]: action.value } };
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

export function LoanCreatePage({ token }: Props) {
  const params = useParams();
  const loanId = Number(params.id);
  const isEditing = Number.isFinite(loanId) && loanId > 0;
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.employees
      .list(token, {
        page: 1,
        take: 100,
        order: 'ASC',
        orderBy: 'fullName',
        ...(isEditing ? {} : { isActive: true }),
      })
      .then((res) => dispatch({ type: 'employeesLoaded', employees: res.data }))
      .catch((err) => dispatch({ type: 'employeesLoadFailed', error: err instanceof Error ? err.message : 'Error cargando empleados' }));
  }, [isEditing, token]);

  useEffect(() => {
    if (!isEditing) return;

    dispatch({ type: 'loanLoadStarted' });
    api.loans
      .get(token, loanId)
      .then((loan) => dispatch({ type: 'loanLoaded', loan }))
      .catch((err) => dispatch({ type: 'loanLoadFailed', error: err instanceof Error ? err.message : 'Error cargando préstamo' }));
  }, [isEditing, loanId, token]);

  function setField<K extends keyof LoanForm>(field: K, value: LoanForm[K]) {
    dispatch({ type: 'formFieldChanged', field, value });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!state.form.employeeId) {
      dispatch({ type: 'submitFailed', error: 'Selecciona un empleado' });
      return;
    }
    dispatch({ type: 'submitStarted' });
    try {
      const payload = {
        employeeId: state.form.employeeId,
        startDate: state.form.startDate,
        principalAmount: Number(state.form.principalAmount),
        suggestedInstallmentAmount: Number(state.form.suggestedInstallmentAmount) || 0,
        notes: state.form.notes,
      };

      if (isEditing) {
        await api.loans.update(token, loanId, payload);
      } else {
        await api.loans.create(token, {
          ...payload,
          suggestedInstallmentAmount: payload.suggestedInstallmentAmount || undefined,
          notes: payload.notes || undefined,
        });
      }

      navigate('/loans');
    } catch (err) {
      dispatch({
        type: 'submitFailed',
        error: err instanceof Error
          ? err.message
          : isEditing
            ? 'Error actualizando préstamo'
            : 'Error creando préstamo',
      });
    }
  }

  const selected = state.employees.find((e) => Number(e.id) === state.form.employeeId);
  const employeeLocked = isEditing && Number(state.loan?.paidAmount ?? 0) > 0;
  const loadingForm = state.loadingEmployees || (isEditing && state.loadingLoan);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{isEditing ? 'Editar préstamo' : 'Crear préstamo'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Corrige los datos del préstamo guardado.' : 'Registra un nuevo préstamo para un empleado.'}
          </p>
        </div>
        <Link to="/loans" className="btn-ghost">← Ver préstamos</Link>
      </header>

      <form className="card-soft p-5 space-y-4 max-w-2xl" onSubmit={submit}>
        {state.loan ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="font-semibold text-blue-700">{fmt.currency(Number(state.loan.paidAmount))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo actual</p>
              <p className="font-semibold">{fmt.currency(Number(state.loan.balance))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="font-semibold">{state.loan.status}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="field md:col-span-2">
            <label htmlFor="loan-employee" className="field-label">Empleado</label>
            <select
              id="loan-employee"
              className="input"
              value={state.form.employeeId}
              onChange={(e) => setField('employeeId', Number(e.target.value))}
              disabled={loadingForm || employeeLocked}
            >
              {state.employees.length === 0
                ? <option value={0}>Sin empleados activos</option>
                : state.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
            </select>
            {selected ? (
              <p className="text-xs text-muted-foreground mt-1">
                Salario base: {fmt.currency(selected.baseSalary)}
              </p>
            ) : null}
            {employeeLocked ? (
              <p className="text-xs text-amber-700 mt-1">
                Este préstamo ya tiene abonos registrados, por eso no se puede cambiar de empleado.
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="loan-startdate" className="field-label">Fecha de inicio</label>
            <input id="loan-startdate" className="input" type="date" value={state.form.startDate} onChange={(e) => setField('startDate', e.target.value)} required disabled={loadingForm} />
          </div>
          <div className="field">
            <label htmlFor="loan-amount" className="field-label">Monto del préstamo</label>
            <input id="loan-amount" className="input" type="number" min={1} value={state.form.principalAmount} onChange={(e) => setField('principalAmount', Number(e.target.value))} required disabled={loadingForm} />
            {state.loan && Number(state.form.principalAmount) < Number(state.loan.paidAmount) ? (
              <p className="text-xs text-red-600 mt-1">
                No puede quedar por debajo de lo ya abonado ({fmt.currency(Number(state.loan.paidAmount))}).
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="loan-installment" className="field-label">Cuota sugerida (opcional)</label>
            <input id="loan-installment" className="input" type="number" min={0} value={state.form.suggestedInstallmentAmount} onChange={(e) => setField('suggestedInstallmentAmount', Number(e.target.value))} disabled={loadingForm} />
          </div>
          <div className="field">
            <label htmlFor="loan-notes" className="field-label">Notas (opcional)</label>
            <input id="loan-notes" className="input" value={state.form.notes} onChange={(e) => setField('notes', e.target.value)} disabled={loadingForm} />
          </div>
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" className="btn-primary" disabled={state.saving || loadingForm}>
          <HandCoins size={14} /> {state.saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar préstamo'}
        </button>
      </form>
    </div>
  );
}
