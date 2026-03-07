import { UserPlus } from 'lucide-react';
import { useReducer } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const DOC_TYPES = ['CC', 'CE', 'TI', 'PAS', 'NIT', 'PPT'];

type Props = { token: string };

type EmployeeForm = {
  fullName: string;
  documentType: string;
  documentNumber: string;
  jobTitle: string;
  baseSalary: number;
  email: string;
  hiredAt: string;
  isActive: boolean;
};

type State = {
  error: string;
  saving: boolean;
  form: EmployeeForm;
};

type Action =
  | { type: 'formFieldChanged'; field: keyof EmployeeForm; value: EmployeeForm[keyof EmployeeForm] }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; error: string }
  | { type: 'submitSucceeded' };

const initialState: State = {
  error: '',
  saving: false,
  form: {
    fullName: '',
    documentType: 'CC',
    documentNumber: '',
    jobTitle: '',
    baseSalary: 0,
    email: '',
    hiredAt: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
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

export function EmployeeCreatePage({ token }: Props) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  function setField<K extends keyof EmployeeForm>(field: K, value: EmployeeForm[K]) {
    dispatch({ type: 'formFieldChanged', field, value });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    dispatch({ type: 'submitStarted' });
    try {
      await api.employees.create(token, {
        ...state.form,
        baseSalary: Number(state.form.baseSalary),
        email: state.form.email || undefined,
      });
      navigate('/employees');
    } catch (err) {
      dispatch({ type: 'submitFailed', error: err instanceof Error ? err.message : 'Error creando empleado' });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Crear empleado</h1>
          <p className="text-sm text-muted-foreground">Registra un nuevo empleado en el sistema.</p>
        </div>
        <Link to="/employees" className="btn-ghost">← Ver empleados</Link>
      </header>

      <form className="card-soft p-5 space-y-4 max-w-3xl" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="field md:col-span-2">
            <label htmlFor="emp-fullname" className="field-label">Nombre completo</label>
            <input id="emp-fullname" className="input" value={state.form.fullName} onChange={(e) => setField('fullName', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="emp-doctype" className="field-label">Tipo de documento</label>
            <select id="emp-doctype" className="input" value={state.form.documentType} onChange={(e) => setField('documentType', e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="emp-docnum" className="field-label">Número de documento</label>
            <input id="emp-docnum" className="input" value={state.form.documentNumber} onChange={(e) => setField('documentNumber', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="emp-jobtitle" className="field-label">Cargo</label>
            <input id="emp-jobtitle" className="input" value={state.form.jobTitle} onChange={(e) => setField('jobTitle', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="emp-salary" className="field-label">Salario base</label>
            <input id="emp-salary" className="input" type="number" min={0} value={state.form.baseSalary} onChange={(e) => setField('baseSalary', Number(e.target.value))} required />
          </div>
          <div className="field">
            <label htmlFor="emp-hiredat" className="field-label">Fecha de contratación</label>
            <input id="emp-hiredat" className="input" type="date" value={state.form.hiredAt} onChange={(e) => setField('hiredAt', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="emp-active" className="field-label">Estado inicial</label>
            <select id="emp-active" className="input" value={String(state.form.isActive)} onChange={(e) => setField('isActive', e.target.value === 'true')}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
          <div className="field md:col-span-2">
            <label htmlFor="emp-email" className="field-label">Correo electrónico (opcional)</label>
            <input id="emp-email" className="input" type="email" value={state.form.email} onChange={(e) => setField('email', e.target.value)} />
          </div>
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" className="btn-primary" disabled={state.saving}>
          <UserPlus size={14} /> {state.saving ? 'Guardando...' : 'Guardar empleado'}
        </button>
      </form>
    </div>
  );
}
