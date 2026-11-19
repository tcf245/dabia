import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageProvider';
import * as api from '../../services/api';
import {
    buildGardenSeed,
    computeGardenBlobs,
    computeGardenLayout,
    computeWordMotion,
    type GardenLayoutInput,
} from '../../utils/gardenLayout';
import { selectVisibleWords, wordVisuals } from './gardenWords';

interface WordGardenProps {
    words: api.GardenWord[];
}

const FALLBACK_CANVAS_SIZE = { width: 680, height: 252 };

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() =>
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false,
    );

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => setReduced(mediaQuery.matches);
        handleChange();
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return reduced;
}

const WordGarden = ({ words }: WordGardenProps) => {
    const { messages } = useI18n();
    const t = messages.profile;
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    const [canvasSize, setCanvasSize] = useState(FALLBACK_CANVAS_SIZE);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        if (el.clientWidth > 0 && el.clientHeight > 0) {
            setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
        }

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        let timer: number | undefined;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const nextWidth = Math.round(entry.contentRect.width);
            const nextHeight = Math.round(entry.contentRect.height);
            if (nextWidth <= 0 || nextHeight <= 0) return;

            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                setCanvasSize((prev) =>
                    prev.width === nextWidth && prev.height === nextHeight
                        ? prev
                        : { width: nextWidth, height: nextHeight },
                );
            }, 150);
        });

        observer.observe(el);

        return () => {
            window.clearTimeout(timer);
            observer.disconnect();
        };
    }, []);

    const isCompact =
        canvasSize.width + 48 < 640 ||
        (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 640);
    const maxWords = isCompact ? 8 : 12;

    const visibleWords = useMemo(() => selectVisibleWords(words, maxWords), [words, maxWords]);

    const seed = useMemo(
        () => buildGardenSeed(visibleWords.map((word) => word.card_id)),
        [visibleWords],
    );

    const layoutInputs = useMemo<GardenLayoutInput[]>(
        () =>
            visibleWords.map((word) => ({
                id: word.card_id,
                text: word.text,
                reading: word.reading ?? word.romaji ?? null,
                fontSize: wordVisuals(word).fontSize,
            })),
        [visibleWords],
    );

    const placed = useMemo(
        () => computeGardenLayout(canvasSize.width, canvasSize.height, layoutInputs, seed),
        [canvasSize.width, canvasSize.height, layoutInputs, seed],
    );

    const blobs = useMemo(() => computeGardenBlobs(seed), [seed]);

    const wordById = useMemo(
        () => new Map(visibleWords.map((word) => [word.card_id, word])),
        [visibleWords],
    );

    return (
        <section className="w-full bg-white rounded-[20px] border border-[#E6E6E3] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
            <div
                data-testid="garden-header"
                className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 pt-6 sm:pt-7 pb-3"
            >
                <h2 className="font-serif text-2xl text-[#2A2A29]">{t.garden}</h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#888888]">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D97757]" aria-hidden="true" />
                        <span>{t.gardenLearning}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#888888]" aria-hidden="true" />
                        <span>{t.gardenMastered}</span>
                    </span>
                    <Link
                        to="/words"
                        className="inline-flex items-center gap-1 text-[#D97757] hover:text-[#B05030] font-medium transition-colors"
                    >
                        <span>{t.gardenViewAll}</span>
                        <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>

            <div
                data-testid="garden-canvas"
                className="relative h-[260px] sm:h-[300px] p-6 overflow-hidden"
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: 'radial-gradient(#E6E6E3 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                    }}
                >
                    <div
                        className="absolute w-56 h-56 rounded-full bg-[#F2DCD6]/35 blur-3xl -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${blobs[0].xPct}%`, top: `${blobs[0].yPct}%` }}
                    />
                    <div
                        className="absolute w-64 h-64 rounded-full bg-[#F2F0EF] blur-3xl -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${blobs[1].xPct}%`, top: `${blobs[1].yPct}%` }}
                    />
                </div>

                <div ref={canvasRef} className="relative w-full h-full">
                    {visibleWords.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-sm text-[#888888] font-light">
                            {t.gardenEmpty}
                        </div>
                    ) : (
                        placed.map((pos, index) => {
                            const word = wordById.get(pos.id);
                            if (!word) return null;

                            const { color, fontSize, isMastered } = wordVisuals(word);
                            const reading = word.reading ?? word.romaji ?? null;
                            const isActive = activeId === word.card_id;
                            const motion = computeWordMotion(word.card_id, seed);

                            const opacityClass = isActive
                                ? 'opacity-100 z-20'
                                : activeId !== null
                                  ? 'opacity-50 z-10'
                                  : isMastered
                                    ? 'opacity-55 z-10'
                                    : 'opacity-100 z-10';

                            const displayColor = isActive && prefersReducedMotion && !isMastered ? '#B05030' : color;

                            const tooltipVerticalClass = pos.y < 64 ? 'top-full mt-2' : 'bottom-full mb-2';
                            const tooltipHorizontalClass =
                                pos.x < 90
                                    ? 'left-0'
                                    : pos.x > canvasSize.width - 90
                                      ? 'right-0'
                                      : 'left-1/2 -translate-x-1/2';

                            const enterStyle = prefersReducedMotion
                                ? undefined
                                : ({ '--enter-delay': `${index * 50}ms` } as CSSProperties);

                            const driftStyle = prefersReducedMotion
                                ? undefined
                                : ({
                                      '--dx': `${motion.dx.toFixed(2)}px`,
                                      '--dy': `${motion.dy.toFixed(2)}px`,
                                      '--rot': `${motion.rot.toFixed(2)}deg`,
                                      '--dur': `${motion.dur.toFixed(2)}s`,
                                      '--delay': `${motion.delay.toFixed(2)}s`,
                                      animationPlayState: isActive ? 'paused' : undefined,
                                  } as CSSProperties);

                            return (
                                <button
                                    key={word.card_id}
                                    type="button"
                                    tabIndex={0}
                                    aria-label={t.gardenWordAria(word.text, isMastered, word.level)}
                                    onMouseEnter={() => setActiveId(word.card_id)}
                                    onMouseLeave={() => setActiveId((prev) => (prev === word.card_id ? null : prev))}
                                    onFocus={() => setActiveId(word.card_id)}
                                    onBlur={() => setActiveId((prev) => (prev === word.card_id ? null : prev))}
                                    onClick={() => navigate(`/words?q=${encodeURIComponent(word.text)}`)}
                                    className={`garden-word absolute flex flex-col items-center justify-center cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] rounded-md transition-opacity duration-200 ${opacityClass}`}
                                    style={{
                                        left: `${pos.x}px`,
                                        top: `${pos.y}px`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    <span
                                        className={prefersReducedMotion ? 'flex flex-col items-center' : 'garden-enter flex flex-col items-center'}
                                        style={enterStyle}
                                    >
                                        <span
                                            className={prefersReducedMotion ? 'flex flex-col items-center' : 'garden-drift flex flex-col items-center'}
                                            style={driftStyle}
                                        >
                                            <span
                                                className={`garden-word-lift flex flex-col items-center transition-transform duration-200 ${
                                                    isActive && !prefersReducedMotion ? 'scale-[1.08]' : ''
                                                }`}
                                            >
                                                <span
                                                    lang="ja"
                                                    className={`font-serif leading-tight select-none transition-colors ${
                                                        isMastered ? 'font-light' : 'font-medium'
                                                    }`}
                                                    style={{ fontSize: `${fontSize}px`, color: displayColor }}
                                                >
                                                    {word.text}
                                                </span>
                                                {reading && (
                                                    <span
                                                        lang="ja"
                                                        className={`font-sans text-[10px] text-[#888888] tracking-normal normal-case leading-tight mt-1 select-none transition-opacity duration-150 ${
                                                            isMastered && !isActive ? 'opacity-0' : 'opacity-100'
                                                        }`}
                                                    >
                                                        {reading}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </span>

                                    {isActive && (reading || word.hint) && (
                                        <span
                                            role="tooltip"
                                            className={`absolute ${tooltipVerticalClass} ${tooltipHorizontalClass} px-2.5 py-1.5 bg-[#2A2A29] text-white text-[11px] rounded-lg pointer-events-none whitespace-nowrap z-30 flex flex-col items-start text-left`}
                                        >
                                            {reading && (
                                                <span lang="ja" className="text-[10px] text-[#E6E6E3] leading-tight">
                                                    {reading}
                                                </span>
                                            )}
                                            {word.hint && (
                                                <span className="font-medium text-white leading-snug">{word.hint}</span>
                                            )}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
};

export default WordGarden;
