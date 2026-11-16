import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
    const { user, token, loading } = useAuth();
    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
    if (!token || !user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
    return children;
}
