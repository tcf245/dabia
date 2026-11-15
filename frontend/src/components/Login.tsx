
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
                <h1 className="mb-2 text-3xl font-serif font-bold text-[#2A2A29] tracking-tight">登录 Dabia</h1>
                <p className="text-[#74746E] text-base">首次登录会自动创建账户，学习进度随账户保存。</p>
            </div>

            <button
                onClick={() => login()}
                className="w-full h-11 bg-white border border-[#E6E6E3] rounded-xl px-4 flex items-center justify-center gap-3 hover:bg-[#F5F4F0] transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
            >
                <GoogleIcon />
                <span className="text-[#2A2A29] font-medium">使用 Google 登录</span>
            </button>

            {error && (
                <p role="alert" className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}
        </div>
    );
};

export default Login;
