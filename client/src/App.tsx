import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';
import HomeLayout from './layouts/HomeLayout';
import WelcomePage from './pages/home/WelcomePage';
import DiscoveryPage from './pages/home/DiscoveryPage';
import RoomPage from './pages/home/RoomPage';
import ChatPage from './pages/home/ChatPage';
import SettingsPage from './pages/home/SettingsPage';
import NotFoundPage from './pages/NotFound';
import './index.css';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomeLayout />}>
          <Route index element={<WelcomePage />} />
          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path="rooms/:roomSlug" element={<RoomPage />} />
          <Route path="rooms/:roomSlug/channels/:channelSlug" element={<ChatPage />} />
          <Route path="rooms/:roomSlug/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
