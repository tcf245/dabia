import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageCircle, Volume2, Clock } from 'lucide-react';
import type { WelcomeCopy } from '../../i18n/welcome';

const SEGMENT_COLORS = ['#F2DCD6', '#E5A087', '#D97757', '#D97757', '#D97757'];

type Phase = 'blank' | 'typing' | 'correct';

const LevelBar: React.FC<{ level: number }> = ({ level }) => (
    <div className="flex gap-1.5" aria-label={`${level} / 5`}>
        {SEGMENT_COLORS.map((color, i) => (
            <div
                key={i}
                className="h-1 w-4 rounded-full transition-colors duration-500"
                style={{ backgroundColor: i < level ? color : '#F2F0EF' }}
            />
        ))}
    </div>
);

/**
 * A self-playing replica of the real Flashcard: the blank fills in,
 * the answer turns correct, and the card is scheduled for its next review.
 */
const DemoCard: React.FC<{ copy: WelcomeCopy }> = ({ copy }) => {
    const DEMO_CARDS = copy.demoCards;
    const reduceMotion = useReducedMotion();
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>(reduceMotion ? 'correct' : 'blank');
    const [typed, setTyped] = useState(reduceMotion ? DEMO_CARDS[0].word.length : 0);

    const card = DEMO_CARDS[index];

    useEffect(() => {
        if (reduceMotion) return;
        let timer: ReturnType<typeof setTimeout>;
        if (phase === 'blank') {
            timer = setTimeout(() => setPhase('typing'), 1100);
        } else if (phase === 'typing') {
            timer = typed < card.word.length
                ? setTimeout(() => setTyped((n) => n + 1), 220)
                : setTimeout(() => setPhase('correct'), 350);
        } else {
            timer = setTimeout(() => {
                setIndex((i) => (i + 1) % DEMO_CARDS.length);
                setTyped(0);
                setPhase('blank');
            }, 2800);
        }
        return () => clearTimeout(timer);
    }, [phase, typed, card.word.length, reduceMotion, DEMO_CARDS.length]);

    const [before, after] = card.template.split('__');
    const isCorrect = phase === 'correct';
    const level = isCorrect ? card.toLevel : card.fromLevel;

    return (
        <div className="w-full max-w-xl mx-auto" aria-label={copy.demoAria}>
            <div className="relative">
            {/* Stacked cards behind, to suggest a deck */}
            <div className="absolute inset-x-6 -bottom-3 h-full rounded-2xl border border-[#E6E6E3] bg-white/70" aria-hidden="true" />
            <div className="absolute inset-x-3 -bottom-1.5 h-full rounded-2xl border border-[#E6E6E3] bg-white/90" aria-hidden="true" />

            <div className="relative rounded-2xl border border-[#E6E6E3] bg-white p-6 sm:p-8 shadow-[0_12px_40px_-12px_rgba(42,42,41,0.12)]">
                <div className="flex items-center justify-between mb-6">
                    <LevelBar level={level} />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#A3A39D]">{copy.demoLabel}</span>
                </div>

                <div className="flex items-center gap-3 mb-6 text-[#2A2A29]">
                    <div className="w-8 h-8 rounded-lg bg-[#F2F0EF] flex items-center justify-center text-[#999999]">
                        <MessageCircle size={16} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-light">{card.hint}</span>
                </div>

                <p lang="ja" className="font-serif font-light text-2xl sm:text-3xl text-center text-[#2A2A29] leading-relaxed min-h-[3.5rem]">
                    {before}
                    <span
                        className={`inline-block align-baseline mx-1.5 px-2 py-0.5 min-w-[4.5ch] transition-all duration-300 ${isCorrect
                            ? 'rounded-lg bg-[#D97757]/10 text-[#D97757] shadow-[0_2px_8px_rgba(217,119,87,0.15)]'
                            : 'border-b-2 border-[#D97757]'
                            }`}
                    >
                        {card.word.slice(0, typed)}
                        {phase === 'typing' && <span className="inline-block w-px h-[1em] align-middle bg-[#D97757] animate-pulse ml-0.5" />}
                        {phase === 'blank' && <span className="invisible">{card.word}</span>}
                    </span>
                    {after}
                </p>

                <div className="h-8 flex items-center justify-center">
                    <AnimatePresence>
                        {isCorrect && (
                            <motion.span
                                key={card.word}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[#D97757] font-semibold"
                                lang="ja"
                            >
                                {card.word === card.reading ? card.reading : `${card.word} (${card.reading})`}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-[#E6E6E3] flex items-center justify-between gap-4">
                    <span className="text-sm font-light text-[#74746E]">{card.translation}</span>
                    <Volume2 size={20} strokeWidth={1.5} className="shrink-0 text-[#BDBDB7]" aria-hidden="true" />
                </div>
            </div>
            </div>

            <div className="mt-8 flex justify-center h-8">
                <AnimatePresence>
                    {isCorrect && (
                        <motion.div
                            key={`next-${card.word}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#E6E6E3] bg-white px-3.5 py-1.5 text-xs text-[#74746E] shadow-sm"
                        >
                            <Clock size={13} className="text-[#D97757]" />
                            {copy.demoNextReview(card.nextReview)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DemoCard;
