import { CredentialResponse, GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { post } from '../services';
import { PVerifyCodeParams, ROUTES_NAMES, RVerifyCodeResult } from '@financial-ai/types'
export const Login = () => {

    const login = useGoogleLogin({
        onSuccess: async (codeResponse) => {
            // 1. This is now the actual 'code' (e.g., "4/0A...")
            const { code } = codeResponse;
            console.log("Auth Code received:", code);

            try {
                // 2. Send the code to your backend
                const response = await post<PVerifyCodeParams, RVerifyCodeResult>(
                    ROUTES_NAMES.AUTH.name + ROUTES_NAMES.AUTH.apis.verify,
                    { code }
                );
                console.log("Backend verified successfully:", response);
            } catch (err) {
                console.error("Verification failed:", err);
            }
        },
        onError: (error) => console.log('Login Failed:', error),
        flow: 'auth-code', // CRITICAL: This ensures you get a 'code' and not a 'token'
    });

    return (
        <div className="flex flex-col items-center gap-4 p-10">
            <h1 className="text-xl font-bold">Welcome Advisor</h1>
            <button
                onClick={() => login()}
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