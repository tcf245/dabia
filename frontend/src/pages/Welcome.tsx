import React, { useEffect, useState } from 'react';
import { BookOpen, Keyboard, CalendarClock, ArrowRight } from 'lucide-react';
import DemoCard from '../components/welcome/DemoCard';
import GoogleIcon from '../components/GoogleIcon';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { getDecks } from '../services/api';
import type { Deck } from '../services/api';
import { deckLabel, isGrammarDeck, sortDecks } from '../utils/decks';
import { zh as copy } from '../i18n/welcome';

interface WelcomeProps {
    onLoginSuccess: (token: string) => void;
}

const STEP_ICONS = [BookOpen, Keyboard, CalendarClock];
const STAGE_COLORS = ['#F2DCD6', '#E5A087', '#D97757', '#C96642', '#B05030'];

const formatCount = (n: number) => n.toLocaleString('en-US');

const SignInButton: React.FC<{ onClick: () => void; variant?: 'dark' | 'light' }> = ({ onClick, variant = 'dark' }) => (
    <button
        onClick={onClick}
        className={`group inline-flex h-12 items-center justify-center gap-3 rounded-xl px-6 text-[15px] font-medium shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2 ${variant === 'dark'
            ? 'bg-[#2A2A29] text-white hover:bg-[#40403F]'
            : 'bg-white text-[#2A2A29] border border-[#E6E6E3] hover:bg-[#F5F4F0]'
            }`}
    >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <GoogleIcon size={16} />
        </span>
        {copy.signIn}
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </button>
);

const Welcome: React.FC<WelcomeProps> = ({ onLoginSuccess }) => {
    const { signIn, error } = useGoogleSignIn(onLoginSuccess);
    const [decks, setDecks] = useState<Deck[]>([]);

    useEffect(() => {
        getDecks()
            .then((data) => setDecks(sortDecks(data)))
            .catch(() => setDecks([]));
    }, []);

    const wordCount = decks.filter((d) => !isGrammarDeck(d)).reduce((sum, d) => sum + d.count, 0);

    return (
        <div lang="zh-CN" className="welcome w-full">
            {/* Hero */}
            <section className="flex flex-col items-center text-center">
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E6E6E3] bg-white px-3 py-1 text-xs font-medium text-[#74746E]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" />
                    {copy.badge}
                </span>
                <h1 className="font-serif text-[2.5rem] leading-[1.2] sm:text-6xl sm:leading-[1.15] tracking-tight text-[#2A2A29] max-w-3xl">
                    {copy.titleLead}<br />
                    <span className="text-[#D97757]">{copy.titleAccent}</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-[#74746E]">{copy.subtitle}</p>
                <div className="mt-9 flex flex-col items-center gap-3">
                    <SignInButton onClick={signIn} />
                    <span className="text-sm text-[#A3A39D]">{copy.signInNote}</span>
                    {error && <span role="alert" className="text-sm text-red-500">{error}</span>}
                </div>
            </section>

            {/* Demo */}
            <section className="mt-20">
                <DemoCard copy={copy} />
            </section>

            {/* How it works */}
            <section className="mt-28">
                <h2 className="font-serif text-3xl text-[#2A2A29] text-center">{copy.stepsTitle}</h2>
                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                    {copy.steps.map(({ title, body }, i) => {
                        const Icon = STEP_ICONS[i];
                        return (
                            <div key={title} className="rounded-2xl border border-[#E6E6E3] bg-white p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2DCD6]/60 text-[#D97757]">
                                        <Icon size={20} strokeWidth={1.75} />
                                    </div>
                                    <span className="font-serif text-sm text-[#BDBDB7]">0{i + 1}</span>
                                </div>
                                <h3 className="mt-5 font-medium text-[#2A2A29]">{title}</h3>
                                <p className="mt-2 text-sm font-light leading-relaxed text-[#74746E]">{body}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SRS ladder */}
            <section className="mt-28 rounded-3xl bg-[#F2F0EF] px-6 py-12 sm:px-12">
                <div className="max-w-2xl">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#D97757]">{copy.srsEyebrow}</span>
                    <h2 className="mt-3 font-serif text-3xl text-[#2A2A29]">{copy.srsTitle}</h2>
                    <p className="mt-4 font-light leading-relaxed text-[#74746E]">{copy.srsBody}</p>
                </div>
                <ol className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-5">
                    {copy.stages.map((stage, i) => (
                        <li key={stage.name} className="flex items-center gap-4 rounded-2xl bg-white p-4 sm:flex-col sm:items-start sm:gap-0">
                            <div className="flex gap-1 sm:mb-6">
                                {copy.stages.map((_, j) => (
                                    <span
                                        key={j}
                                        className="h-1 w-3 rounded-full"
                                        style={{ backgroundColor: j <= i ? STAGE_COLORS[i] : '#E6E6E3' }}
                                    />
                                ))}
                            </div>
                            <div>
                                <div className="font-medium text-[#2A2A29]">{stage.name}</div>
                                <div className="mt-0.5 text-xs text-[#74746E]">{stage.interval}</div>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Decks */}
            {decks.length > 0 && (
                <section className="mt-28">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <h2 className="font-serif text-3xl text-[#2A2A29]">{copy.decksTitle}</h2>
                        <span className="text-sm text-[#74746E]">{copy.decksSummary(formatCount(wordCount))}</span>
                    </div>
                    <ul className="mt-8 divide-y divide-[#E6E6E3] rounded-2xl border border-[#E6E6E3] bg-white">
                        {decks.map((deck) => {
                            const grammar = isGrammarDeck(deck);
                            return (
                                <li key={deck.id} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <span data-testid="deck-label" className="font-serif text-lg text-[#2A2A29] min-w-[7rem]">
                                            {deckLabel(deck.name).replace(/ Grammar$/, ` ${copy.grammarSuffix}`)}
                                        </span>
                                        <span className="rounded-md bg-[#F2F0EF] px-2 py-0.5 text-xs text-[#74746E]">
                                            {copy.difficulty[deck.difficulty] ?? deck.difficulty}
                                        </span>
                                    </div>
                                    <span className="text-sm tabular-nums text-[#74746E]">
                                        {copy.deckUnit(formatCount(deck.count), grammar)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Closing CTA */}
            <section className="mt-28 rounded-3xl bg-[#2A2A29] px-6 py-14 text-center sm:px-12">
                <h2 className="font-serif text-3xl text-white sm:text-4xl">{copy.ctaTitle}</h2>
                <p className="mx-auto mt-4 max-w-lg font-light text-[#BDBDB7]">{copy.ctaBody}</p>
                <div className="mt-8 flex flex-col items-center gap-3">
                    <SignInButton onClick={signIn} variant="light" />
                    {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
                </div>
            </section>

            <footer className="mt-16 mb-4 flex flex-col gap-2 text-xs text-[#A3A39D] sm:flex-row sm:justify-between">
                <span>{copy.footerOrigin}</span>
                <span>
                    {copy.footerCreditPrefix}
                    <a href="https://github.com/5mdld/anki-jlpt-decks" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#74746E]">
                        anki-jlpt-decks
                    </a>
                    {copy.footerCreditSuffix}
                </span>
            </footer>
        </div>
    );
};

export default Welcome;
