import { Calculator } from 'lucide-react';
import { useEffect, useReducer } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmt } from '../api/client';
import type { Employee, Loan, PayrollConfig } from '../api/client';

type Props = { token: string };
const HEALTH_EMPLOYEE_RATE = 4;
const PENSION_EMPLOYEE_RATE = 4;

type PayrollForm = {
  employeeId: number;
  loanId: number | undefined;
  paymentDate: string;
  year: number;
  month: number;
  daysWorked: number;
  earnedSalary: number;
  earnedExtras: number;
  deductionHealth: number;
  deductionPension: number;
  deductionLoan: number;
  deductionOther: number;
};

type State = {
  employees: Employee[];
  activeLoan: Loan | null;
  payrollConfig: PayrollConfig | null;
  error: string;
  saving: boolean;
  form: PayrollForm;
  loadingEmployees: boolean;
  loadingLoan: boolean;
  loadingPayroll: boolean;
};

type Action =
  | { type: 'employeesLoaded'; employees: Employee[] }
  | { type: 'employeesLoadFailed'; error: string }
  | { type: 'configLoaded'; config: PayrollConfig }
  | { type: 'configLoadFailed'; error: string }
  | { type: 'employeeSelected'; employeeId: number }
  | { type: 'loanLoaded'; loan: Loan | null; loanId: number | undefined }
  | { type: 'loanLoadFailed' }
  | { type: 'payrollLoaded'; form: PayrollForm }
  | { type: 'payrollLoadFailed'; error: string }
  | { type: 'formFieldChanged'; field: keyof PayrollForm; value: PayrollForm[keyof PayrollForm] }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; error: string }
  | { type: 'submitSucceeded' };

const initialForm: PayrollForm = {
  employeeId: 0,
  loanId: undefined,
  paymentDate: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  daysWorked: 30,
  earnedSalary: 0,
  earnedExtras: 0,
  deductionHealth: 0,
  deductionPension: 0,
  deductionLoan: 0,
  deductionOther: 0,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function recalcMandatoryDeductions(form: PayrollForm): PayrollForm {
  const base = Number(form.earnedSalary) + Number(form.earnedExtras);
  return {
    ...form,
    deductionHealth: roundMoney((base * HEALTH_EMPLOYEE_RATE) / 100),
    deductionPension: roundMoney((base * PENSION_EMPLOYEE_RATE) / 100),
  };
}

const initialState: State = {
  employees: [],
  activeLoan: null,
  payrollConfig: null,
  error: '',
  saving: false,
  form: initialForm,
  loadingEmployees: false,
  loadingLoan: false,
  loadingPayroll: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'employeesLoaded': {
      const first = action.employees[0];
      return {
        ...state,
        employees: action.employees,
        loadingEmployees: false,
        form: first
          ? recalcMandatoryDeductions({ ...state.form, employeeId: Number(first.id), earnedSalary: Number(first.baseSalary) })
          : state.form,
      };
    }
    case 'employeesLoadFailed':
      return { ...state, error: action.error, loadingEmployees: false };
    case 'configLoaded':
      return { ...state, payrollConfig: action.config };
    case 'configLoadFailed':
      return { ...state, error: action.error };
    case 'employeeSelected': {
      const emp = state.employees.find((e) => Number(e.id) === action.employeeId);
      return {
        ...state,
        form: recalcMandatoryDeductions({
          ...state.form,
          employeeId: action.employeeId,
          earnedSalary: emp ? Number(emp.baseSalary) : state.form.earnedSalary,
          loanId: undefined,
        }),
        activeLoan: null,
      };
    }
    case 'loanLoaded':
      return {
        ...state,
        activeLoan: action.loan,
        form: {
          ...state.form,
          loanId: action.loanId,
          deductionLoan: action.loan?.suggestedInstallmentAmount
            ? Number(action.loan.suggestedInstallmentAmount)
            : state.form.deductionLoan,
        },
        loadingLoan: false,
      };
    case 'loanLoadFailed':
      return { ...state, activeLoan: null, loadingLoan: false };
    case 'payrollLoaded':
      return { ...state, form: action.form, loadingPayroll: false };
    case 'payrollLoadFailed':
      return { ...state, error: action.error, loadingPayroll: false };
    case 'formFieldChanged':
      if (action.field === 'earnedSalary' || action.field === 'earnedExtras') {
        return {
          ...state,
          form: recalcMandatoryDeductions({ ...state.form, [action.field]: action.value }),
        };
      }
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

export function PayrollCreatePage({ token }: Props) {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditing = Boolean(editId);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'employeesLoadFailed', error: '' });
    api.employees
      .list(token, { page: 1, take: 100, order: 'ASC', orderBy: 'fullName', isActive: true })
      .then((res) => dispatch({ type: 'employeesLoaded', employees: res.data }))
      .catch((err) => dispatch({ type: 'employeesLoadFailed', error: err instanceof Error ? err.message : 'Error cargando empleados' }));
  }, [token]);

  // In edit mode, load existing payroll record and override form
  useEffect(() => {
    if (!editId) return;
    api.payroll
      .get(token, Number(editId))
      .then((record) => {
        dispatch({
          type: 'payrollLoaded',
          form: {
            employeeId: record.employeeId,
            loanId: undefined,
            paymentDate: record.paymentDate ?? '',
            year: record.year,
            month: record.month,
            daysWorked: Number(record.daysWorked),
            earnedSalary: Number(record.earnedSalary),
            earnedExtras: Number(record.earnedExtras),
            deductionHealth: Number(record.deductionHealth),
            deductionPension: Number(record.deductionPension),
            deductionLoan: Number(record.deductionLoan),
            deductionOther: Number(record.deductionOther),
          },
        });
      })
      .catch((err) => dispatch({ type: 'payrollLoadFailed', error: err instanceof Error ? err.message : 'Error cargando nómina' }));
  }, [token, editId]);

  useEffect(() => {
    api.payroll
      .config(token)
      .then((config) => dispatch({ type: 'configLoaded', config }))
      .catch((err) => dispatch({ type: 'configLoadFailed', error: err instanceof Error ? err.message : 'Error cargando configuración de nómina' }));
  }, [token]);

  useEffect(() => {
    if (!state.form.employeeId) {
      dispatch({ type: 'loanLoaded', loan: null, loanId: undefined });
      return;
    }
    dispatch({ type: 'loanLoadFailed' });
    api.loans
      .list(token, { page: 1, take: 1, employeeId: state.form.employeeId, status: 'ACTIVO' })
      .then((res) => {
        const loan = res.data[0] ?? null;
        dispatch({ type: 'loanLoaded', loan, loanId: loan ? Number(loan.id) : undefined });
      })
      .catch(() => dispatch({ type: 'loanLoadFailed' }));
  }, [token, state.form.employeeId]);

  function setField<K extends keyof PayrollForm>(field: K, value: PayrollForm[K]) {
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
      const { loanId, paymentDate, ...rest } = state.form;
      if (isEditing && editId) {
        await api.payroll.update(token, Number(editId), {
          ...rest,
          ...(paymentDate ? { paymentDate } : {}),
        });
      } else {
        await api.payroll.create(token, {
          ...rest,
          ...(paymentDate ? { paymentDate } : {}),
          ...(loanId ? { loanId } : {}),
        });
      }
      navigate('/payroll');
    } catch (err) {
      dispatch({ type: 'submitFailed', error: err instanceof Error ? err.message : 'Error guardando nómina' });
    }
  }

  const workedDaysForAllowance = Math.max(0, Math.min(30, Number(state.form.daysWorked)));
  const transportAllowancePreview = state.payrollConfig
    ? Number(state.form.earnedSalary) <= state.payrollConfig.transportAllowanceSalaryLimit
      ? Math.round(state.payrollConfig.transportAllowanceDaily * workedDaysForAllowance * 100) / 100
      : 0
    : 0;
  const totalEarnings = state.form.earnedSalary + state.form.earnedExtras + transportAllowancePreview;
  const totalDeductions = state.form.deductionHealth + state.form.deductionPension + state.form.deductionLoan + state.form.deductionOther;
  const netPay = totalEarnings - totalDeductions;
  const loanProgressPct = state.activeLoan
    ? Math.min(100, Math.round((Number(state.activeLoan.paidAmount) / Number(state.activeLoan.principalAmount)) * 100))
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{isEditing ? 'Editar nómina' : 'Crear nómina'}</h1>
          <p className="text-sm text-muted-foreground">{isEditing ? 'Corrige los valores y vuelve a impulsar.' : 'Liquidación mensual para un empleado activo.'}</p>
        </div>
        <Link to="/payroll" className="btn-ghost">← Ver nóminas</Link>
      </header>

      <form className="space-y-4 max-w-3xl" onSubmit={submit}>
        <div className="card-soft p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="field md:col-span-3">
              <label htmlFor="employee-select" className="field-label">Empleado</label>
              <select
                id="employee-select"
                className={`input${isEditing ? ' bg-muted/40' : ''}`}
                value={state.form.employeeId}
                disabled={isEditing}
                onChange={(e) => dispatch({ type: 'employeeSelected', employeeId: Number(e.target.value) })}
              >
                {state.employees.length === 0
                  ? <option value={0}>Sin empleados activos</option>
                  : state.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
              {isEditing ? <p className="text-[11px] text-muted-foreground mt-1">No se puede cambiar el empleado al editar</p> : null}
            </div>
            <div className="field">
              <label htmlFor="payroll-payment-date" className="field-label">Fecha de pago</label>
              <input
                id="payroll-payment-date"
                className="input"
                type="date"
                value={state.form.paymentDate}
                onChange={(e) => setField('paymentDate', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="payroll-year" className="field-label">Año</label>
              <input id="payroll-year" className={`input${isEditing ? ' bg-muted/40' : ''}`} type="number" value={state.form.year} readOnly={isEditing} onChange={(e) => setField('year', Number(e.target.value))} required />
            </div>
            <div className="field">
              <label htmlFor="payroll-month" className="field-label">Mes</label>
              <input id="payroll-month" className={`input${isEditing ? ' bg-muted/40' : ''}`} type="number" min={1} max={12} value={state.form.month} readOnly={isEditing} onChange={(e) => setField('month', Number(e.target.value))} required />
            </div>
            <div className="field">
              <label htmlFor="payroll-days" className="field-label">Días trabajados</label>
              <input id="payroll-days" className="input" type="number" min={0} max={31} value={state.form.daysWorked} onChange={(e) => setField('daysWorked', Number(e.target.value))} required />
            </div>
          </div>
        </div>

        <div className="card-soft p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Devengado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="payroll-salary" className="field-label">Salario devengado</label>
              <input id="payroll-salary" className="input" type="number" min={0} value={state.form.earnedSalary} onChange={(e) => setField('earnedSalary', Number(e.target.value))} required />
            </div>
            <div className="field">
              <label htmlFor="payroll-extras" className="field-label">Extras / bonificaciones</label>
              <input id="payroll-extras" className="input" type="number" min={0} value={state.form.earnedExtras} onChange={(e) => setField('earnedExtras', Number(e.target.value))} required />
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-emerald-900">Auxilio de transporte estimado</p>
                <p className="text-xs text-emerald-700">
                  {state.payrollConfig
                    ? `Se liquida con ${workedDaysForAllowance} día(s) sobre ${fmt.currency(state.payrollConfig.transportAllowanceMonthly)} al mes.`
                    : 'Cargando parámetros de nómina...'}
                </p>
              </div>
              <p className="text-base font-bold tabular-nums text-emerald-900">
                {fmt.currency(transportAllowancePreview)}
              </p>
            </div>
            {state.payrollConfig ? (
              Number(state.form.earnedSalary) <= state.payrollConfig.transportAllowanceSalaryLimit ? (
                <p className="text-xs text-emerald-700">
                  Aplica porque el salario devengado no supera {fmt.currency(state.payrollConfig.transportAllowanceSalaryLimit)}.
                </p>
              ) : (
                <p className="text-xs text-amber-700">
                  No aplica porque el salario devengado supera {fmt.currency(state.payrollConfig.transportAllowanceSalaryLimit)}.
                </p>
              )
            ) : null}
            {Number(state.form.daysWorked) > 30 ? (
              <p className="text-xs text-amber-700">
                Para el cálculo del auxilio se toman máximo 30 días.
              </p>
            ) : null}
          </div>
        </div>

        <div className="card-soft p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deducciones</h2>

          {state.activeLoan ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Préstamo activo · #{state.activeLoan.id}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Capital prestado</p>
                  <p className="font-semibold tabular-nums">{fmt.currency(Number(state.activeLoan.principalAmount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total pagado</p>
                  <p className="font-semibold tabular-nums text-emerald-700">{fmt.currency(Number(state.activeLoan.paidAmount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                  <p className="font-bold tabular-nums">{fmt.currency(Number(state.activeLoan.balance))}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de pago</span>
                  <span>{loanProgressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-blue-200 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${loanProgressPct}%` }} />
                </div>
              </div>
              {state.activeLoan.suggestedInstallmentAmount ? (
                <p className="text-xs text-blue-700">
                  Cuota sugerida: <span className="font-semibold">{fmt.currency(Number(state.activeLoan.suggestedInstallmentAmount))}</span>
                </p>
              ) : null}
            </div>
          ) : state.form.employeeId ? (
            <p className="text-xs text-muted-foreground">Este empleado no tiene préstamos activos.</p>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="field">
              <label htmlFor="deduction-health" className="field-label">Salud</label>
              <input id="deduction-health" className="input bg-muted/40" type="number" min={0} value={state.form.deductionHealth} readOnly required />
              <p className="text-[11px] text-muted-foreground mt-1">Autocalculado ({HEALTH_EMPLOYEE_RATE}%)</p>
            </div>
            <div className="field">
              <label htmlFor="deduction-pension" className="field-label">Pensión</label>
              <input id="deduction-pension" className="input bg-muted/40" type="number" min={0} value={state.form.deductionPension} readOnly required />
              <p className="text-[11px] text-muted-foreground mt-1">Autocalculado ({PENSION_EMPLOYEE_RATE}%)</p>
            </div>
            <div className="field">
              <label htmlFor="deduction-loan" className="field-label">Préstamo</label>
              <input id="deduction-loan" className="input" type="number" min={0} value={state.form.deductionLoan} onChange={(e) => setField('deductionLoan', Number(e.target.value))} required />
              {state.activeLoan && Number(state.form.deductionLoan) > Number(state.activeLoan.balance) ? (
                <p className="text-xs text-amber-600 mt-1">Supera el saldo ({fmt.currency(Number(state.activeLoan.balance))})</p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="deduction-other" className="field-label">Otras</label>
              <input id="deduction-other" className="input" type="number" min={0} value={state.form.deductionOther} onChange={(e) => setField('deductionOther', Number(e.target.value))} required />
            </div>
          </div>
        </div>

        <div className="card-soft p-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total devengado</p>
            <p className="font-semibold tabular-nums">{fmt.currency(totalEarnings)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Incluye auxilio estimado de {fmt.currency(transportAllowancePreview)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total deducciones</p>
            <p className="font-semibold tabular-nums text-red-600">{fmt.currency(totalDeductions)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Neto a pagar</p>
            <p className={`font-bold tabular-nums text-base ${netPay < 0 ? 'text-red-600' : ''}`}>{fmt.currency(netPay)}</p>
          </div>
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button type="submit" className="btn-primary" disabled={state.saving}>
          <Calculator size={14} /> {state.saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear nómina'}
        </button>
      </form>
    </div>
  );
}
