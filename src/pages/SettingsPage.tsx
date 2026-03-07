import { KeyRound } from 'lucide-react';
import { useReducer } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api/client';

type Props = { token: string };

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type State = {
  form: PasswordForm;
  error: string;
  success: string;
  saving: boolean;
};

type Action =
  | { type: 'formFieldChanged'; field: keyof PasswordForm; value: string }
  | { type: 'submitStarted' }
  | { type: 'submitSucceeded'; message: string }
  | { type: 'submitFailed'; error: string }
  | { type: 'reset' };

const initialState: State = {
  form: { currentPassword: '', newPassword: '', confirmPassword: '' },
  error: '',
  success: '',
  saving: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'formFieldChanged':
      return { ...state, form: { ...state.form, [action.field]: action.value }, error: '', success: '' };
    case 'submitStarted':
      return { ...state, error: '', success: '', saving: true };
    case 'submitSucceeded':
      return { ...state, success: action.message, saving: false, form: { currentPassword: '', newPassword: '', confirmPassword: '' } };
    case 'submitFailed':
      return { ...state, error: action.error, saving: false };
    case 'reset':
      return { ...state, error: '', success: '' };
    default:
      return state;
  }
}

export function SettingsPage({ token }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  function setField(field: keyof PasswordForm, value: string) {
    dispatch({ type: 'formFieldChanged', field, value });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (state.form.newPassword !== state.form.confirmPassword) {
      dispatch({ type: 'submitFailed', error: 'La confirmación no coincide con la nueva contraseña' });
      return;
    }

    dispatch({ type: 'submitStarted' });
    try {
      const res = await api.changePassword(token, {
        currentPassword: state.form.currentPassword,
        newPassword: state.form.newPassword,
      });
      dispatch({ type: 'submitSucceeded', message: res.message });
    } catch (err) {
      dispatch({ type: 'submitFailed', error: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña' });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header>
        <h1 className="text-lg font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Configuración de la cuenta.</p>
      </header>

      <form className="card-soft p-5 max-w-md space-y-4" onSubmit={submit}>
        <div className="flex items-center gap-2.5 pb-2 border-b">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
            <KeyRound size={14} className="text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
        </div>

        <div className="field">
          <label htmlFor="current-password" className="field-label">Contraseña actual</label>
          <input id="current-password" className="input" type="password" value={state.form.currentPassword} onChange={(e) => setField('currentPassword', e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="new-password" className="field-label">Nueva contraseña</label>
          <input id="new-password" className="input" type="password" minLength={8} value={state.form.newPassword} onChange={(e) => setField('newPassword', e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="confirm-password" className="field-label">Confirmar nueva contraseña</label>
          <input id="confirm-password" className="input" type="password" minLength={8} value={state.form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} required />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

        <button type="submit" className="btn-primary" disabled={state.saving}>
          {state.saving ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </div>
  );
}
