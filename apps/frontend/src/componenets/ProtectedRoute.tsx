import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { Spinner } from './Spinner';


export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading, isHubspotConnected } = useAuth();

    const connectHubSpot = () => {
        const clientId = import.meta.env.VITE_REACT_APP_HUBSPOT_CLIENT_ID;
        // 1. This must be the ONE URL whitelisted n HubSpot Dev Portal
        const redirectUri = "http://localhost:4200/hubSpotAuth";

        // 3. Put that current URL into the 'state' parameter
        const scopes = "crm.objects.contacts.read crm.objects.deals.read crm.objects.orders.read";
        const authUrl = `https://app.hubspot.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}`

        window.location.href = authUrl;
    }
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