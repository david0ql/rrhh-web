import { BarChart3, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Tenant } from '../api/client';
import { session } from '../app/session';

type Props = {
  onLogin: () => void;
};

export function LoginPage({ onLogin }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSlug, setTenantSlug] = useState(() => session.getTenantSlug());
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    api.tenants
      .listPublic()
      .then((items) => {
        if (cancelled) return;
        setTenants(items);
        setTenantSlug((current) => {
          const hasCurrent = items.some((tenant) => tenant.slug === current);
          if (hasCurrent) return current;
          return items.length > 0 ? items[0].slug : current;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setTenants([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!tenantSlug) {
      setError('Selecciona un tenant');
      return;
    }

    try {
      const result = await api.login(username, password, tenantSlug);
      session.setToken(result.access_token);
      session.setTenantSlug(tenantSlug);
      onLogin();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticacion');
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-foreground/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-primary-foreground" />
          </div>
          <span className="text-primary-foreground font-semibold text-lg">Amaya RH</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80 text-xs font-medium">
              <Shield size={12} />
              Portal del administrador
            </div>
            <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
              control total,
              <br />
              un tablero.
            </h2>
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-sm">
              Administra empleados, nomina y prestamos con una interfaz moderna y profesional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Empleados', value: 'Directorio vivo', icon: '👥' },
              { label: 'Nomina', value: 'Mensual', icon: '💳' },
              { label: 'Prestamos', value: 'Saldo en tiempo real', icon: '📉' },
              { label: 'Seguridad', value: 'JWT + Passport', icon: '🔐' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className="text-primary-foreground font-semibold text-sm">{stat.value}</div>
                <div className="text-primary-foreground/50 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-foreground/30 text-xs">© {new Date().getFullYear()} Amaya RH.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 size={16} className="text-primary-foreground" />
            </div>
            <span className="font-semibold">Amaya RH</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                <Lock size={13} className="text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Portal de administración
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
            <p className="text-muted-foreground text-sm">Acceso administrador únicamente</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="tenant" className="text-sm font-medium">Tenant</label>
              <select
                id="tenant"
                className="input"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
              >
                {tenants.length === 0 ? (
                  <option value={tenantSlug}>Sin tenants cargados</option>
                ) : (
                  tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.slug}>
                      {tenant.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">Usuario o correo</label>
              <input
                id="username"
                className="input"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button type="submit" className="btn-primary w-full">
              Iniciar sesión en el portal de administración
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
