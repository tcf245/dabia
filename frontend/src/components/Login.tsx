
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import GoogleIcon from './GoogleIcon';

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
    const { signIn: login, error } = useGoogleSignIn(onLoginSuccess);

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-serif font-bold text-[#3d3929] tracking-tight">Welcome back</h1>
                <p className="text-[#83827d] text-base">Sign in to your account to continue</p>
            </div>

            <div className="w-full space-y-3">
                <button
                    onClick={() => login()}
                    className="w-full bg-white border border-[#dad9d4] rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-[#f5f4f0] transition-colors shadow-sm group"
                >
                    <GoogleIcon />
                    <span className="text-[#3d3929] font-medium">Continue with Google</span>
                </button>

                {/* Placeholder for GitHub button if needed in future */}
                {/* <button className="w-full bg-white border border-[#dad9d4] rounded-lg py-2.5 px-4 flex items-center justify-center gap-3 hover:bg-[#f5f4f0] transition-colors shadow-sm text-[#3d3929] font-medium">
                    <GithubIcon /> Continue with GitHub
                </button> */}
            </div>

            {error && (
                <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}

            <div className="flex items-center gap-4 w-full my-8">
                <div className="h-px bg-[#dad9d4] flex-1"></div>
                <span className="text-xs font-medium text-[#83827d] uppercase tracking-wider">New to Dabia?</span>
                <div className="h-px bg-[#dad9d4] flex-1"></div>
            </div>

            <button className="text-[#c96442] hover:text-[#a85335] font-medium text-sm transition-colors">
                Create an account
            </button>
        </div>
    );
};

export default Login;
