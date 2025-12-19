import { useState, useEffect } from 'react';
import * as api from '../services/api';

const Profile = () => {

    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [gardenWords, setGardenWords] = useState<any[]>([]);
    // const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heatmap, garden] = await Promise.all([
                    api.getProfileHeatmap(),
                    api.getProfileGarden()
                ]);

                // Process heatmap to match the 104 days grid
                const today = new Date();
                const daysMap = new Map();
                heatmap.forEach((d) => daysMap.set(d.date, d));

                const newDays = Array.from({ length: 104 }, (_, i) => {
                    const date = new Date(today);
                    date.setDate(date.getDate() - (103 - i));
                    const dateStr = date.toISOString().split('T')[0];
                    const dayData = daysMap.get(dateStr);

                    let colorClass = 'bg-[var(--paper-gray)]';
                    if (dayData) {
                        if (dayData.level >= 3) colorClass = 'bg-[var(--brand)]';
                        else if (dayData.level >= 1) colorClass = 'bg-[var(--brand-light)]';
                    }

                    return { id: i, date: dateStr, colorClass, count: dayData?.count || 0 };
                });

                setHeatmapData(newDays);

                // Exclude only top-left corner (Row 0, Col 0) to keep title clear
                // Use a 3x3 grid for 8 words to be more centered
                const COLS = 3;
                const ROWS = 3;
                const validSlots: { r: number, c: number }[] = [];

                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        // Exclude only top-left corner for title
                        if (r === 0 && c === 0) continue;
                        validSlots.push({ r, c });
                    }
                }

                // Shuffle slots to randomize position assignments
                const shuffledSlots = validSlots.sort(() => 0.5 - Math.random());

                // Limit to 8 words max per design specification
                const gardenSubset = garden.slice(0, 8);

                const newWords = gardenSubset.map((w, i) => {
                    const slot = shuffledSlots[i];

                    // Asymmetric padding: less horizontal, more top vertical
                    const PADDING_LEFT = 10;
                    const PADDING_RIGHT = 10;
                    const PADDING_TOP = 30;    // More space from top (title area)
                    const PADDING_BOTTOM = 10; // Less from bottom

                    const safeWidth = 100 - PADDING_LEFT - PADDING_RIGHT;
                    const safeHeight = 100 - PADDING_TOP - PADDING_BOTTOM;

                    // Cell dimensions within safe area
                    const cellWidth = safeWidth / COLS;
                    const cellHeight = safeHeight / ROWS;

                    // Center of the cell (offset by padding)
                    const centerX = PADDING_LEFT + slot.c * cellWidth + cellWidth / 2;
                    const centerY = PADDING_TOP + slot.r * cellHeight + cellHeight / 2;

                    // Jitter: Allow moderate movement (40% of cell) but clamp to safe bounds
                    const jitterX = (Math.random() - 0.5) * (cellWidth * 0.4);
                    const jitterY = (Math.random() - 0.5) * (cellHeight * 0.4);

                    // Clamp to safe area
                    const x = Math.max(PADDING_LEFT, Math.min(100 - PADDING_RIGHT, centerX + jitterX));
                    const y = Math.max(PADDING_TOP, Math.min(100 - PADDING_BOTTOM, centerY + jitterY));

                    const sizes = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
                    const size = sizes[Math.floor(Math.random() * sizes.length)];

                    return { ...w, x: `${x}%`, y: `${y}%`, size };
                });
                setGardenWords(newWords);

            } catch (error) {
                console.error("Failed to fetch profile data", error);
            } finally {
                // setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Use heatmapData if loaded, else (or initially) maybe empty or skeleton?
    // The original code used 104 mock items directly.
    // If loading, we could show skeleton or just the empty grid.

    const displayDays = heatmapData.length > 0 ? heatmapData : Array.from({ length: 104 }, (_, i) => ({ id: i, colorClass: 'bg-[var(--paper-gray)]' }));


    return (
        <div className="flex flex-col items-center w-full max-w-3xl animate-fade-in">
            <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-normal text-[#1A1A1A] mb-4 tracking-tight" style={{ lineHeight: '1' }}>Your Journey</h1>
                <p className="text-[#888] text-sm font-light tracking-wider mt-3">
                    每一次坚持，都是记忆的生长。
                </p>
            </header>

            <section className="bg-white rounded-[20px] border border-[#E6E6E3] p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] w-full mb-10">
                <div className="flex justify-between items-baseline mb-8">
                    <h2 className="font-serif text-2xl text-[#333]">Study Streak</h2>

                    <div className="flex items-center gap-3 text-sm text-[#888] font-light">
                        <span>Less</span>
                        <div className="flex gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-[2px] bg-[#F2F0EF]"></div>
                            <div className="w-3.5 h-3.5 rounded-[2px] bg-[#F2DCD6]"></div>
                            <div className="w-3.5 h-3.5 rounded-[2px] bg-[#D97757]"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-[4px] justify-center sm:justify-start">
                    {displayDays.map((day) => (
                        <div
                            key={day.id}
                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] transition-all duration-300 hover:scale-125 cursor-pointer ${day.colorClass}`}
                            title={day.date ? `${day.date}: ${day.count} reviews` : `Day ${day.id + 1}`}
                        ></div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-[#F0F0F0] text-center">
                    <p className="text-[#888] font-serif italic text-sm tracking-wide">
                        "You practiced 24 days in the last 3 months."
                    </p>
                </div>
            </section>

            <section className="relative h-80 w-full bg-white rounded-[20px] border border-[#E6E6E3] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="absolute top-8 left-10 z-20 pointer-events-none">
                    <h2 className="font-serif text-2xl text-[#333]">Vocabulary Garden</h2>
                    <p className="text-sm text-[#555] mt-2 font-light">需复习 (Review) & 已掌握 (Mastered)</p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>

                <div className="absolute inset-0">
                    {gardenWords.map((word, i) => {
                        // Animation: float with random duration between 3s and 7s
                        const duration = 3 + Math.random() * 4;
                        return (
                            <div
                                key={i}
                                className="absolute flex flex-col items-center justify-center cursor-pointer hover:opacity-100 transition-opacity animate-float"
                                style={{
                                    left: word.x,
                                    top: word.y,
                                    transform: 'translate(-50%, -50%)',
                                    animationDuration: `${duration}s`,
                                    opacity: word.type === 'review' ? 1 : 0.5,
                                }}
                            >
                                <span className={`font-serif ${word.size} ${word.type === 'review' ? 'text-[#D97757] font-medium' : 'text-[#555]'} select-none`}>
                                    {word.text}
                                </span>
                                <span className="font-sans text-[10px] text-[#999] tracking-[0.2em] uppercase mt-1 select-none">
                                    {word.romaji}
                                </span>
                                {word.type === 'review' && (
                                    <span className="w-1 h-1 bg-[#D97757] rounded-full mt-1"></span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Profile;
