import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';


export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    // 1. Show loading state first
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-lg font-medium">Loading...</p>
            </div>
        );
    }

    // 2. If not authenticated, show the Login UI right here (no redirect)
    if (!isAuthenticated) {
        return <Login />;
    }

    // 3. If authenticated, show the private content
    return <Outlet />;
};