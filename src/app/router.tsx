import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useReducer } from 'react';
import { session } from './session';
import { LoginPage } from '../pages/LoginPage';
import { AppLayout } from '../layout/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { PayrollPage } from '../pages/PayrollPage';
import { SettingsPage } from '../pages/SettingsPage';
import { EmployeeCreatePage } from '../pages/EmployeeCreatePage';
import { LoanCreatePage } from '../pages/LoanCreatePage';
import { LoanPaymentsPage } from '../pages/LoanPaymentsPage';
import { LoansOverviewPage } from '../pages/LoansOverviewPage';
import { PayrollCreatePage } from '../pages/PayrollCreatePage';
import { api } from '../api/client';

function Protected({ onLogout }: { onLogout: () => void }) {
  return <AppLayout onLogout={onLogout} />;
}

type AuthState = {
  token: string | null;
  ready: boolean;
};

type AuthAction =
  | { type: 'initComplete'; token: string | null }
  | { type: 'login' }
  | { type: 'logout' };

const initialState: AuthState = {
  token: null,
  ready: false,
};

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'initComplete':
      return { ...state, token: action.token, ready: true };
    case 'login':
      return { ...state, token: session.getToken() };
    case 'logout':
      session.clear();
      return { ...state, token: null };
    default:
      return state;
  }
}

export function AppRouter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const currentToken = session.getToken();
    if (!currentToken) {
      dispatch({ type: 'initComplete', token: null });
      return;
    }

    api.me(currentToken)
      .then(() => {
        dispatch({ type: 'initComplete', token: currentToken });
      })
      .catch(() => {
        dispatch({ type: 'initComplete', token: null });
      });
  }, []);

  function handleLogin() {
    dispatch({ type: 'login' });
  }

  function handleLogout() {
    dispatch({ type: 'logout' });
  }

  if (!state.ready) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={state.token ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
      />

      <Route
        path="/"
        element={state.token ? <Protected onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<DashboardPage token={state.token ?? ''} />} />
        <Route path="employees" element={<EmployeesPage token={state.token ?? ''} />} />
        <Route path="employees/create" element={<EmployeeCreatePage token={state.token ?? ''} />} />
        <Route path="payroll" element={<PayrollPage token={state.token ?? ''} />} />
        <Route path="payroll/create" element={<PayrollCreatePage token={state.token ?? ''} />} />

        <Route path="loans" element={<LoansOverviewPage token={state.token ?? ''} />} />
        <Route path="loans/create" element={<LoanCreatePage token={state.token ?? ''} />} />
        <Route path="loans/payments" element={<LoanPaymentsPage token={state.token ?? ''} />} />

        <Route path="settings" element={<SettingsPage token={state.token ?? ''} />} />
      </Route>

      <Route path="*" element={<Navigate to={state.token ? '/' : '/login'} replace />} />
    </Routes>
  );
}
