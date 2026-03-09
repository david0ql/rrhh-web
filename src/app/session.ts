const TOKEN_KEY = 'dally_rh_token';
const TENANT_KEY = 'dally_rh_tenant';
const DEFAULT_TENANT = 'amaya';

function emitTenantChanged(tenantSlug: string) {
  window.dispatchEvent(new CustomEvent('tenant-changed', { detail: tenantSlug }));
}

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getTenantSlug: () => localStorage.getItem(TENANT_KEY) ?? DEFAULT_TENANT,
  setTenantSlug: (tenantSlug: string) => {
    localStorage.setItem(TENANT_KEY, tenantSlug);
    emitTenantChanged(tenantSlug);
  },
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
