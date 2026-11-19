import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { BookMarked, BookOpen, ChevronDown, Layers, LogOut, UserRound } from 'lucide-react';
import LanguageSelect from './LanguageSelect';
import { useI18n } from '../i18n/LanguageProvider';
import type { Messages } from '../i18n';

export interface HeaderUser {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
}

interface AppHeaderProps {
    user: HeaderUser | null;
    onLogin: () => void;
    onLogout: () => void;
}

const NAV_ITEMS: { to: string; label: keyof Messages['header']; icon: typeof BookOpen; end: boolean }[] = [
    { to: '/', label: 'learn', icon: BookOpen, end: true },
    { to: '/decks', label: 'decks', icon: Layers, end: false },
    { to: '/words', label: 'words', icon: BookMarked, end: false },
    { to: '/profile', label: 'profile', icon: UserRound, end: false },
];

/** The recall-card brand mark, same artwork as public/favicon.svg. */
const BrandMark: React.FC = () => (
    <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#D97757" />
        <g transform="rotate(-8 32 32)">
            <rect x="13" y="17" width="38" height="30" rx="6" fill="#FFFFFF" />
            <rect x="19" y="25" width="14" height="4" rx="2" fill="#E6E6E3" />
            <rect x="19" y="36" width="26" height="4" rx="2" fill="#D97757" />
        </g>
    </svg>
);

const Avatar: React.FC<{ user: HeaderUser; size: 'sm' | 'md' }> = ({ user, size }) => {
    const dimension = size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base';
    if (user.picture) {
        return <img src={user.picture} alt="" className={`${dimension} rounded-full object-cover ring-1 ring-black/5`} />;
    }
    return (
        <span className={`${dimension} flex items-center justify-center rounded-full bg-[#F2DCD6] font-medium text-[#B05030]`}>
            {(user.name || user.email || '?')[0].toUpperCase()}
        </span>
    );
};

const AppHeader: React.FC<AppHeaderProps> = ({ user, onLogin, onLogout }) => {
    const [scrolled, setScrolled] = useState(false);
    const { messages } = useI18n();
    const t = messages.header;

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-40 w-full transition-[background-color,border-color] duration-200 ${scrolled
                ? 'border-b border-[#E6E6E3] bg-[#F9F9F8]/85 backdrop-blur-md'
                : 'border-b border-transparent bg-[#F9F9F8]'
                }`}
        >
            <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-0">
                <Link to="/" className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]">
                    <BrandMark />
                    <span className="font-serif text-2xl font-bold tracking-tight text-[#D97757]">Dabia.</span>
                </Link>

                {user ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <nav aria-label={t.mainNav} className="flex items-center gap-1 rounded-full bg-[#F2F0EF] p-1">
                            {NAV_ITEMS.map(({ to, label: key, icon: Icon, end }) => {
                                const label = t[key];
                                return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    aria-label={label}
                                    className={({ isActive }) => `flex h-8 items-center gap-1.5 rounded-full px-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] sm:px-3.5 ${isActive
                                        ? 'bg-white text-[#2A2A29] shadow-[0_1px_2px_rgba(42,42,41,0.08)] ring-1 ring-black/[0.04]'
                                        : 'text-[#74746E] hover:text-[#2A2A29]'
                                        }`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon size={16} strokeWidth={isActive ? 2 : 1.75} className={isActive ? 'text-[#D97757]' : ''} />
                                            <span className="hidden sm:inline">{label}</span>
                                        </>
                                    )}
                                </NavLink>
                                );
                            })}
                        </nav>

                        <LanguageSelect />

                        <Menu>
                            <MenuButton
                                aria-label={t.accountMenu}
                                className="flex items-center gap-1 rounded-full p-0.5 transition-colors sm:pr-1.5 hover:bg-[#F2F0EF] focus:outline-none data-[focus]:ring-2 data-[focus]:ring-[#D97757] data-[open]:bg-[#F2F0EF]"
                            >
                                <Avatar user={user} size="sm" />
                                <ChevronDown size={14} className="hidden text-[#A3A39D] sm:block" />
                            </MenuButton>
                            <MenuItems
                                transition
                                anchor="bottom end"
                                className="z-50 mt-2 w-64 origin-top-right rounded-2xl border border-[#E6E6E3] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(42,42,41,0.18)] focus:outline-none transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                            >
                                <div className="flex items-center gap-3 px-3 py-3">
                                    <Avatar user={user} size="md" />
                                    <div className="min-w-0">
                                        {user.name && <div className="truncate text-sm font-medium text-[#2A2A29]">{user.name}</div>}
                                        {user.email && <div className="truncate text-xs text-[#74746E]">{user.email}</div>}
                                    </div>
                                </div>
                                <div className="my-1 h-px bg-[#E6E6E3]" />
                                <MenuItem>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#2A2A29] data-[focus]:bg-[#F2F0EF]"
                                    >
                                        <UserRound size={16} className="text-[#74746E]" />
                                        {t.profileAndStats}
                                    </Link>
                                </MenuItem>
                                <MenuItem>
                                    <button
                                        onClick={onLogout}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#2A2A29] data-[focus]:bg-[#F2F0EF]"
                                    >
                                        <LogOut size={16} className="text-[#74746E]" />
                                        {t.logOut}
                                    </button>
                                </MenuItem>
                            </MenuItems>
                        </Menu>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                    <LanguageSelect />
                    <button
                        onClick={onLogin}
                        className="h-9 rounded-lg border border-[#E6E6E3] bg-white px-4 text-sm font-medium text-[#2A2A29] shadow-sm transition-colors hover:bg-[#F5F4F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]"
                    >
                        {t.signIn}
                    </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AppHeader;
