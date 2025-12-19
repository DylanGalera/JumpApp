import { CredentialResponse, GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { post } from '../services';
import { PVerifyCodeParams, ROUTES_NAMES, RVerifyCodeResult } from '@financial-ai/types'
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
export const Login = () => {

    const { login } = useAuth()
    const loginUser = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            try {
                const response = await post<PVerifyCodeParams, RVerifyCodeResult>(
                    ROUTES_NAMES.AUTH.name + ROUTES_NAMES.AUTH.apis.login,
                    codeResponse
                );
                if (response.success) {
                    toast.success('Welcome ' + response.name)
                    login(response.user)
                } else {
                    toast.error('Login Failed')
                }
            } catch (err) {
                toast.error("Verification failed:" + err)
            }
        },
        onError: (error) => console.log('Login Failed:', error),
        flow: 'auth-code', // CRITICAL: This ensures you get a 'code' and not a 'token'
    });

    return (
        <div className="flex flex-col items-center gap-4 p-10">
            <h1 className="text-xl font-bold">Welcome Advisor</h1>
            <button
                onClick={() => loginUser()}
                className="flex items-center gap-3 px-6 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors bg-white text-gray-700 font-medium"
            >
                <img
                    src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                    alt="Google"
                    className="w-5 h-5"
                />
                Sign in with Google
            </button>
        </div>
    );
};