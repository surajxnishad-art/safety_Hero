import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { AppLayout, PublicLayout } from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Help from './pages/Help.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { ModulePage, ModulesIndex } from './pages/Modules.jsx';
import Documents from './pages/Documents.jsx';
import AIAssistant from './pages/AI.jsx';
import { JobDetail, Jobs } from './pages/Jobs.jsx';
import Admin from './pages/Admin.jsx';
import Account from './pages/Account.jsx';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

function NotFound() {
  return (
    <div className="container narrow center" style={{ padding: '80px 16px' }}>
      <div style={{ fontSize: 56 }} aria-hidden="true">🛡</div>
      <h1>Page not found</h1>
      <p className="muted">The page you are looking for does not exist or has moved.</p>
      <a className="btn btn-primary" href="/">Back to home</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/modules" element={<ModulesIndex />} />
        <Route path="/modules/:key" element={<ModulePage />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
