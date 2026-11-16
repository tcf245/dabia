import React from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { MESSAGES } from '../i18n';
import { useI18n } from '../i18n/LanguageProvider';

/** Compact language menu for the header. Hidden while only one language is available. */
const LanguageSelect: React.FC = () => {
    const { language, languages, setLanguage, messages } = useI18n();
    if (languages.length < 2) return null;

    return (
        <Menu>
            <MenuButton
                aria-label={messages.language.label}
                className="flex h-8 items-center gap-1.5 rounded-full px-2 text-sm sm:px-2.5 text-[#74746E] transition-colors hover:bg-[#F2F0EF] hover:text-[#2A2A29] focus:outline-none data-[focus]:ring-2 data-[focus]:ring-[#D97757] data-[open]:bg-[#F2F0EF] data-[open]:text-[#2A2A29]"
            >
                <Globe size={16} strokeWidth={1.75} />
                <span className="hidden sm:inline">{messages.languageName}</span>
                <ChevronDown size={14} className="hidden text-[#A3A39D] sm:block" />
            </MenuButton>
            <MenuItems
                transition
                anchor="bottom end"
                className="z-50 mt-2 w-44 origin-top-right rounded-2xl border border-[#E6E6E3] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(42,42,41,0.18)] focus:outline-none transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
            >
                {languages.map((code) => (
                    <MenuItem key={code}>
                        <button
                            onClick={() => setLanguage(code)}
                            lang={MESSAGES[code].locale}
                            aria-current={code === language ? 'true' : undefined}
                            className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm text-[#2A2A29] data-[focus]:bg-[#F2F0EF]"
                        >
                            {MESSAGES[code].languageName}
                            {code === language && <Check size={15} className="text-[#D97757]" />}
                        </button>
                    </MenuItem>
                ))}
            </MenuItems>
        </Menu>
    );
};

export default LanguageSelect;
