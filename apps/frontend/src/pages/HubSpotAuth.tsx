import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { post } from '../services';
import { PVerifyCodeParams, ROUTES_NAMES } from '@financial-ai/types';
import { useAuth } from '../context/AuthContext';

export function HubSpotAuth() {
    const { setHubSpot } = useAuth()
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            post<PVerifyCodeParams, boolean>(ROUTES_NAMES.AUTH.name + ROUTES_NAMES.AUTH.apis.hubspot, { code })
                .then((r) => {
                    if (r) {
                        navigate('/');
                        setHubSpot()
                    }
                })
                .catch(err => {
                    toast.error("HubSpot Auth Failed")
                    navigate('/')
                });
        }
    }, [searchParams, navigate]);

    return <div>Connecting to HubSpot... Please wait.</div>;
}