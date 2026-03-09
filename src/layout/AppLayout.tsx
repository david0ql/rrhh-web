import { BarChart3, ChevronRight, Command, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { session } from '../app/session';

type Props = {
  onLogout: () => void;
};

type MenuLeaf = { label: string; to: string };
type MenuGroup = { label: string; children: Array<MenuLeaf | MenuGroup> };
type MenuNode = MenuLeaf | MenuGroup;

function isLeaf(node: MenuNode): node is MenuLeaf {
  return (node as MenuLeaf).to !== undefined;
}

const menu: MenuNode[] = [
  { label: 'Dashboard', to: '/' },
  {
    label: 'Empleados',
    children: [
      { label: 'Ver empleados', to: '/employees' },
      { label: 'Crear empleado', to: '/employees/create' },
    ],
  },
  {
    label: 'Nómina',
    children: [
      { label: 'Ver nóminas', to: '/payroll' },
      { label: 'Crear nómina', to: '/payroll/create' },
    ],
  },
  {
    label: 'Préstamos',
    children: [
      { label: 'Ver préstamos', to: '/loans' },
      { label: 'Crear préstamo', to: '/loans/create' },
      { label: 'Ver abonos', to: '/loans/payments' },
    ],
  },
];

export function AppLayout({ onLogout }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState(() => session.getTenantSlug());
  const tenantName =
    tenantSlug.length > 0 ? `${tenantSlug.charAt(0).toUpperCase()}${tenantSlug.slice(1)}` : 'Tenant';

  useEffect(() => {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail === 'string' && customEvent.detail.trim()) {
        setTenantSlug(customEvent.detail.trim().toLowerCase());
        return;
      }
      setTenantSlug(session.getTenantSlug());
    };

    window.addEventListener('tenant-changed', listener);
    return () => {
      window.removeEventListener('tenant-changed', listener);
    };
  }, []);

  function logout() {
    onLogout();
    navigate('/login');
  }

  function isActive(node: MenuNode): boolean {
    if (isLeaf(node)) return location.pathname === node.to;
    return node.children.some((child) => isActive(child));
  }

  function renderNode(node: MenuNode, depth = 0) {
    if (isLeaf(node)) {
      return (
        <Link
          key={node.to}
          to={node.to}
          className={`sidebar-item ${isActive(node) ? 'active' : ''}`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          {node.label}
        </Link>
      );
    }

    const active = isActive(node);
    return (
      <details key={`${node.label}-${depth}`} open={active} className="submenu-group space-y-1">
        <summary
          className={`sidebar-item cursor-pointer list-none ${active ? 'active' : ''}`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <ChevronRight size={14} className="submenu-chevron" />
          <span className="flex-1">{node.label}</span>
        </summary>
        <div className="space-y-1 ml-2 border-l border-border/70 pl-2">
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      </details>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen w-72 bg-card border-r flex flex-col z-40">
        <div className="h-14 px-4 flex items-center border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 size={14} className="text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-sm tracking-tight block">{tenantName} RH</span>
              <span className="text-[10px] uppercase text-muted-foreground tracking-wide">Tenant activo</span>
            </div>
          </div>
        </div>

        <button className="sidebar-command-trigger mx-3 mt-3" type="button">
          <Command size={12} />
          <span className="flex-1 text-left">Buscar sección...</span>
          <kbd className="sidebar-command-kbd">⌘K</kbd>
        </button>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {menu.map((node) => renderNode(node))}
        </nav>

        <div className="border-t p-3 space-y-1">
          <Link to="/settings" className="sidebar-item w-full text-left">
            <Settings size={16} className="text-muted-foreground" />
            Ajustes
          </Link>
          <button
            onClick={logout}
            className="sidebar-item w-full text-left text-rose-700 hover:text-rose-800 hover:bg-rose-50"
            type="button"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
