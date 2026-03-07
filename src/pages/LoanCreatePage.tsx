import { HandCoins } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { Employee } from '../api/client';

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
  error: string;
  saving: boolean;
  form: LoanForm;
};

type Action =
  | { type: 'employeesLoaded'; employees: Employee[] }
  | { type: 'employeesLoadFailed'; error: string }
  | { type: 'formFieldChanged'; field: keyof LoanForm; value: LoanForm[keyof LoanForm] }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; error: string }
  | { type: 'submitSucceeded' };

const initialState: State = {
  employees: [],
  error: '',
  saving: false,
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
        form: { ...state.form, employeeId: firstId },
      };
    }
    case 'employeesLoadFailed':
      return { ...state, error: action.error };
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
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.employees
      .list(token, { page: 1, take: 100, order: 'ASC', orderBy: 'fullName', isActive: true })
      .then((res) => dispatch({ type: 'employeesLoaded', employees: res.data }))
      .catch((err) => dispatch({ type: 'employeesLoadFailed', error: err instanceof Error ? err.message : 'Error cargando empleados' }));
  }, [token]);

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
      await api.loans.create(token, {
        employeeId: state.form.employeeId,
        startDate: state.form.startDate,
        principalAmount: Number(state.form.principalAmount),
        suggestedInstallmentAmount: state.form.suggestedInstallmentAmount || undefined,
        notes: state.form.notes || undefined,
      });
      navigate('/loans');
    } catch (err) {
      dispatch({ type: 'submitFailed', error: err instanceof Error ? err.message : 'Error creando préstamo' });
    }
  }

  const selected = state.employees.find((e) => Number(e.id) === state.form.employeeId);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Crear préstamo</h1>
          <p className="text-sm text-muted-foreground">Registra un nuevo préstamo para un empleado.</p>
        </div>
        <Link to="/loans" className="btn-ghost">← Ver préstamos</Link>
      </header>

      <form className="card-soft p-5 space-y-4 max-w-2xl" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="field md:col-span-2">
            <label htmlFor="loan-employee" className="field-label">Empleado</label>
            <select
              id="loan-employee"
              className="input"
              value={state.form.employeeId}
              onChange={(e) => setField('employeeId', Number(e.target.value))}
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
          </div>
          <div className="field">
            <label htmlFor="loan-startdate" className="field-label">Fecha de inicio</label>
            <input id="loan-startdate" className="input" type="date" value={state.form.startDate} onChange={(e) => setField('startDate', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="loan-amount" className="field-label">Monto del préstamo</label>
            <input id="loan-amount" className="input" type="number" min={1} value={state.form.principalAmount} onChange={(e) => setField('principalAmount', Number(e.target.value))} required />
          </div>
          <div className="field">
            <label htmlFor="loan-installment" className="field-label">Cuota sugerida (opcional)</label>
            <input id="loan-installment" className="input" type="number" min={0} value={state.form.suggestedInstallmentAmount} onChange={(e) => setField('suggestedInstallmentAmount', Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="loan-notes" className="field-label">Notas (opcional)</label>
            <input id="loan-notes" className="input" value={state.form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" className="btn-primary" disabled={state.saving}>
          <HandCoins size={14} /> {state.saving ? 'Guardando...' : 'Guardar préstamo'}
        </button>
      </form>
    </div>
  );
}
