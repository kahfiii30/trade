import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/layout/AppLayout';

import { Dashboard } from './pages/Dashboard';

import { JournalTable } from './pages/JournalTable';

import { TradeFormPage } from './pages/TradeFormPage';

import { Analytics } from './pages/Analytics';

import { CalendarHeatmap } from './pages/CalendarHeatmap';

import { Playbook } from './pages/Playbook';

// Placeholder Pages
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            
            <Route element={<AppLayout />}>
              {/* Public Read-Only Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/journal" element={<JournalTable />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/calendar" element={<CalendarHeatmap />} />
              <Route path="/playbook" element={<Playbook />} />
              
              {/* Protected Routes (Owner Only) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/trades/new" element={<TradeFormPage />} />
                <Route path="/trades/edit/:id" element={<TradeFormPage />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
