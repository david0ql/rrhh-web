import { Building2, KeyRound, Plus } from 'lucide-react';
import { useCallback, useEffect, useReducer, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api/client';
import type { Tenant } from '../api/client';
import { session } from '../app/session';

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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsError, setTenantsError] = useState('');
  const [tenantMessage, setTenantMessage] = useState('');
  const [activeTenant, setActiveTenant] = useState(() => session.getTenantSlug());
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [creatingTenant, setCreatingTenant] = useState(false);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    setTenantsError('');
    try {
      const items = await api.tenants.list(token);
      setTenants(items);
      if (items.length > 0 && !items.some((tenant) => tenant.slug === activeTenant)) {
        setActiveTenant(items[0].slug);
      }
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : 'No se pudo cargar tenants');
    } finally {
      setTenantsLoading(false);
    }
  }, [activeTenant, token]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

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

  function applyActiveTenant() {
    if (!activeTenant) return;
    session.setTenantSlug(activeTenant.trim().toLowerCase());
    setTenantMessage('Tenant activo actualizado');
  }

  async function createTenant(event: FormEvent) {
    event.preventDefault();
    setTenantMessage('');
    setTenantsError('');
    setCreatingTenant(true);

    try {
      const created = await api.tenants.create(token, {
        name: newTenantName.trim(),
        ...(newTenantSlug.trim()
          ? { slug: newTenantSlug.trim().toLowerCase() }
          : {}),
      });
      setNewTenantName('');
      setNewTenantSlug('');
      setActiveTenant(created.slug);
      session.setTenantSlug(created.slug);
      setTenantMessage(`Tenant "${created.name}" creado correctamente`);
      await loadTenants();
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : 'No se pudo crear el tenant');
    } finally {
      setCreatingTenant(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <header>
        <h1 className="text-lg font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Configuración de cuenta y tenant activo.</p>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-6xl">
        <form className="card-soft p-5 space-y-4" onSubmit={submit}>
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

        <div className="card-soft p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
              <Building2 size={14} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Tenants</h2>
          </div>

          <div className="field">
            <label htmlFor="active-tenant" className="field-label">Tenant activo para esta sesión</label>
            <div className="flex gap-2">
              <select
                id="active-tenant"
                className="input"
                value={activeTenant}
                onChange={(e) => setActiveTenant(e.target.value)}
                disabled={tenantsLoading || tenants.length === 0}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.slug}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
              <button type="button" className="btn-secondary" onClick={applyActiveTenant} disabled={!activeTenant}>
                Aplicar
              </button>
            </div>
          </div>

          <form className="space-y-3 pt-2 border-t" onSubmit={createTenant}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agregar tenant</p>
            <div className="field">
              <label htmlFor="tenant-name" className="field-label">Nombre</label>
              <input
                id="tenant-name"
                className="input"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Ej: Nuevo Cliente"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="tenant-slug" className="field-label">Slug (opcional)</label>
              <input
                id="tenant-slug"
                className="input"
                value={newTenantSlug}
                onChange={(e) => setNewTenantSlug(e.target.value)}
                placeholder="ej: nuevo-cliente"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={creatingTenant}>
              <Plus size={14} />
              {creatingTenant ? 'Creando...' : 'Crear tenant'}
            </button>
          </form>

          {tenantsError ? <p className="text-sm text-red-600">{tenantsError}</p> : null}
          {tenantMessage ? <p className="text-sm text-emerald-700">{tenantMessage}</p> : null}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Tenants registrados (solo creación habilitada, sin borrado):
            </p>
            <ul className="space-y-1 text-sm">
              {tenants.length === 0 ? (
                <li className="text-muted-foreground">Sin tenants disponibles</li>
              ) : (
                tenants.map((tenant) => (
                  <li key={tenant.id} className="flex items-center justify-between py-1">
                    <span>{tenant.name}</span>
                    <span className="text-xs uppercase text-muted-foreground">{tenant.slug}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
