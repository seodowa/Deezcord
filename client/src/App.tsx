import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoadingScreen from './components/LoadingScreen';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';
import HomeLayout from './layouts/HomeLayout';
import WelcomeDashboard from './pages/home/WelcomeDashboard';
import DiscoveryPage from './pages/home/DiscoveryPage';
import RoomPage from './pages/home/RoomPage';
import ChatPage from './pages/home/ChatPage';
import SettingsPage from './pages/home/SettingsPage';
import NotFoundPage from './pages/NotFound';
import './index.css';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen message="Verifying session..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Starting Deezcord..." />;
  }

  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<WelcomeDashboard />} />
          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path=":roomSlug" element={<RoomPage />} />
          <Route path=":roomSlug/settings" element={<SettingsPage />} />
          <Route path=":roomSlug/:channelSlug" element={<ChatPage />} />
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
