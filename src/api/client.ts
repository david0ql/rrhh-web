import { session } from '../app/session';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type SessionUser = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
};

export type DashboardSummary = {
  employees: {
    total: number;
    active: number;
    inactive: number;
  };
  payroll: {
    records: number;
    latestPeriod: { year: number; month: number } | null;
    latestTotals: {
      totalEarnings: number;
      totalDeductions: number;
      netPay: number;
    };
  };
  loans: {
    activeCount: number;
    activeBalance: number;
  };
};

export type LoginResponse = {
  access_token: string;
  token_type: 'Bearer';
  user: SessionUser;
};

export type PaginationOrder = 'ASC' | 'DESC';

export type ListQuery = {
  page?: number;
  take?: number;
  order?: PaginationOrder;
  orderBy?: string;
};

export type LoansListQuery = ListQuery & {
  employeeId?: number;
  status?: 'ACTIVO' | 'PAGADO' | 'CANCELADO';
};

export type EmployeesListQuery = ListQuery & {
  isActive?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    order: PaginationOrder;
    orderBy: string | null;
  };
};

export type EmployeeOrderBy = 'id' | 'fullName' | 'hiredAt' | 'baseSalary' | 'createdAt';
export type PayrollOrderBy = 'id' | 'year' | 'month' | 'netPay' | 'paymentDate' | 'createdAt';
export type LoanOrderBy = 'id' | 'startDate' | 'principalAmount' | 'paidAmount' | 'balance' | 'status' | 'createdAt';
export type LoanPaymentOrderBy = 'id' | 'paymentDate' | 'amount' | 'source' | 'createdAt';

export type Employee = {
  id: number;
  fullName: string;
  documentType: string;
  documentNumber: string;
  jobTitle: string;
  baseSalary: number;
  email?: string;
  hiredAt: string;
  isActive: boolean;
};

export type PayrollRecord = {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  year: number;
  month: number;
  paymentDate?: string;
  daysWorked: number;
  earnedSalary: number;
  earnedExtras: number;
  earnedTransportAllowance: number;
  deductionHealth: number;
  deductionPension: number;
  deductionLoan: number;
  deductionOther: number;
  transportAllowanceMonthly?: number;
  transportAllowanceDaily?: number;
  minimumWageMonthly?: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  notes?: string;
};

export type Loan = {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  startDate: string;
  principalAmount: number;
  suggestedInstallmentAmount?: number;
  paidAmount: number;
  balance: number;
  status: 'ACTIVO' | 'PAGADO' | 'CANCELADO';
  notes?: string;
};

export type LoanPayment = {
  id: number;
  loanId: number;
  payrollId?: number;
  paymentDate: string;
  amount: number;
  source: 'NOMINA' | 'CAJA' | 'TRANSFERENCIA';
  notes?: string;
};

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
};

function withQuery(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function requestBlob(
  path: string,
  token: string,
  init?: Omit<RequestInit, 'headers'>,
  tenantSlug?: string,
): Promise<Blob> {
  const activeTenant = (tenantSlug ?? session.getTenantSlug()).trim().toLowerCase();
  const response = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? 'GET',
    body: init?.body,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(activeTenant ? { 'x-tenant': activeTenant } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string,
  tenantSlug?: string,
): Promise<T> {
  const activeTenant = (tenantSlug ?? session.getTenantSlug()).trim().toLowerCase();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeTenant ? { 'x-tenant': activeTenant } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        message = parsed.message.join(', ');
      } else if (typeof parsed.message === 'string') {
        message = parsed.message;
      } else {
        message = body || message;
      }
    } catch {
      message = body || message;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const fmt = {
  currency: (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v),
  date: (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
  period: (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
};

export const api = {
  health: () => request<{ ok: boolean; service: string; timestamp: string }>('/health'),
  dashboardSummary: (token: string) =>
    request<DashboardSummary>('/dashboard/summary', { method: 'GET' }, token),

  login: (username: string, password: string, tenantSlug?: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, undefined, tenantSlug),

  me: (token: string) => request<SessionUser>('/auth/me', { method: 'GET' }, token),
  changePassword: (
    token: string,
    payload: { currentPassword: string; newPassword: string },
  ) =>
    request<{ success: boolean; message: string }>(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  employees: {
    list: (token: string, query?: EmployeesListQuery) =>
      request<PaginatedResponse<Employee>>(withQuery('/employees', query), { method: 'GET' }, token),
    create: (
      token: string,
      payload: Omit<Employee, 'id'>,
    ) =>
      request<Employee>(
        '/employees',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      ),
    update: (token: string, id: number, payload: Partial<Omit<Employee, 'id'>>) =>
      request<Employee>(
        `/employees/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
        token,
      ),
  },

  payroll: {
    list: (token: string, query?: ListQuery) =>
      request<PaginatedResponse<PayrollRecord>>(withQuery('/payroll', query), { method: 'GET' }, token),
    create: (
      token: string,
      payload: {
        employeeId: number;
        year: number;
        month: number;
        paymentDate?: string;
        daysWorked: number;
        earnedSalary: number;
        earnedExtras: number;
        deductionHealth: number;
        deductionPension: number;
        deductionLoan: number;
        deductionOther: number;
        notes?: string;
        loanId?: number;
      },
    ) =>
      request<PayrollRecord>(
        '/payroll',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      ),
    pdf: (token: string, id: number) => requestBlob(`/payroll/${id}/pdf`, token),
    pdfZip: (token: string, payrollIds: number[]) =>
      requestBlob('/payroll/pdf/zip', token, {
        method: 'POST',
        body: JSON.stringify({ payrollIds }),
      }),
  },

  loans: {
    list: (token: string, query?: LoansListQuery) =>
      request<PaginatedResponse<Loan>>(withQuery('/loans', query), { method: 'GET' }, token),
    listPayments: (token: string, query?: ListQuery) =>
      request<PaginatedResponse<LoanPayment>>(withQuery('/loans/payments', query), { method: 'GET' }, token),
    create: (
      token: string,
      payload: {
        employeeId: number;
        startDate: string;
        principalAmount: number;
        suggestedInstallmentAmount?: number;
        notes?: string;
      },
    ) =>
      request<Loan>(
        '/loans',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      ),
    pay: (
      token: string,
      payload: {
        loanId: number;
        payrollId?: number;
        paymentDate: string;
        amount: number;
        source?: 'NOMINA' | 'CAJA' | 'TRANSFERENCIA';
        notes?: string;
      },
    ) =>
      request<{ loan: Loan; payment: LoanPayment }>(
        '/loans/payments',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      ),
  },

  tenants: {
    listPublic: () => request<Tenant[]>('/tenants/public', { method: 'GET' }),
    list: (token: string) => request<Tenant[]>('/tenants', { method: 'GET' }, token),
    create: (token: string, payload: { name: string; slug?: string }) =>
      request<Tenant>(
        '/tenants',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      ),
  },
};
