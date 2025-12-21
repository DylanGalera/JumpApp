import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { Spinner } from './Spinner';


export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    // 1. Show loading state first
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner />
            </div>
        );
    }

    // 2. If not authenticated, show the Login UI right here (no redirect)
    if (!isAuthenticated) {
        return <Login />;
    }

    // 3. If authenticated, show the private content
    return <Outlet />
};