
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import GoogleIcon from './GoogleIcon';
import { useI18n } from '../i18n/LanguageProvider';

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
    const { signIn: login, error } = useGoogleSignIn(onLoginSuccess);
    const t = useI18n().messages.login;

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-serif font-bold text-[#2A2A29] tracking-tight">{t.title}</h1>
                <p className="text-[#74746E] text-base">{t.subtitle}</p>
            </div>

            <button
                onClick={() => login()}
                className="w-full h-11 bg-white border border-[#E6E6E3] rounded-xl px-4 flex items-center justify-center gap-3 hover:bg-[#F5F4F0] transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
            >
                <GoogleIcon />
                <span className="text-[#2A2A29] font-medium">{t.google}</span>
            </button>

            {error && (
                <p role="alert" className="mt-4 text-sm text-red-500 text-center">{error}</p>
            )}
        </div>
    );
};

export default Login;
