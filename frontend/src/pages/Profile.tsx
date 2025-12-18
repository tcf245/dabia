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

                // Process Garden with Grid-based Jitter + Exclusion Zone
                // We define a 5x4 grid but exclude the top-left area where the title is.

                const COLS = 5;
                const ROWS = 4;
                const validSlots: { r: number, c: number }[] = [];

                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        // Exclude Top-Left (Row 0, Col 0 & 1) to avoid "Garden" title collision
                        if (r === 0 && c <= 1) continue;
                        validSlots.push({ r, c });
                    }
                }

                // Shuffle slots to randomize position assignments
                const shuffledSlots = validSlots.sort(() => 0.5 - Math.random());

                // We can accomodate at most shuffledSlots.length words
                const gardenSubset = garden.slice(0, shuffledSlots.length);

                const newWords = gardenSubset.map((w, i) => {
                    const slot = shuffledSlots[i];

                    // Cell dimensions in %
                    const cellWidth = 100 / COLS;
                    const cellHeight = 100 / ROWS;

                    // Center of the cell
                    const centerX = slot.c * cellWidth + cellWidth / 2;
                    const centerY = slot.r * cellHeight + cellHeight / 2;

                    // Jitter: Allow moderate movement (50% of cell)
                    const jitterX = (Math.random() - 0.5) * (cellWidth * 0.5);
                    const jitterY = (Math.random() - 0.5) * (cellHeight * 0.5);

                    const x = centerX + jitterX;
                    const y = centerY + jitterY;

                    const sizes = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
                    // Larger words for 'review' type? Or random.
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
        <div className="flex flex-col items-center w-full max-w-2xl animate-fade-in">
            <header className="text-center mb-8 space-y-2">
                <h1 className="font-serif text-3xl text-[#2A2A29]">Your Progress</h1>
                <p className="text-[#74746E] text-sm font-light tracking-wide">
                    Keep the rhythm alive.
                </p>
            </header>

            <section className="bg-white rounded-2xl border border-[var(--border)] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full mb-8">
                <div className="flex justify-between items-end mb-6">
                    <h2 className="font-serif text-lg font-medium text-[#2A2A29]">Heatmap</h2>

                    <div className="flex items-center gap-2 text-[10px] text-[#999]">
                        <span>Less</span>
                        <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--paper-gray)]"></div>
                        <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--brand-light)]"></div>
                        <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--brand)]"></div>
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

                <div className="mt-6 pt-4 border-t border-dashed border-[#eee] text-center">
                    <p className="text-xs text-[#999] font-serif italic">
                        "You practiced 24 days in the last 3 months."
                    </p>
                </div>
            </section>

            <section className="relative h-72 w-full bg-white rounded-2xl border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="absolute top-6 left-6 z-20 pointer-events-none">
                    <h2 className="font-serif text-lg font-medium text-[#2A2A29]">Garden</h2>
                    <p className="text-xs text-[#888] mt-1 font-light">Floating memories</p>
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
                                    animationDuration: `${duration}s`,
                                    opacity: word.type === 'review' ? 1 : 0.5,
                                }}
                            >
                                <span className={`font-serif ${word.size} ${word.type === 'review' ? 'text-[#D97757] font-medium' : 'text-[#555]'} select-none`}>
                                    {word.text}
                                </span>
                                <span className="text-[10px] text-[#999] tracking-widest uppercase mt-1 select-none">
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
