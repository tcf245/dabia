import { useState, useEffect } from 'react';
import * as api from '../services/api';

const Profile = () => {

    const [heatmapData, setHeatmapData] = useState<{ date: string; colorClass: string; count: number }[][]>([]);
    const [gardenWords, setGardenWords] = useState<(api.GardenWord & { x: string; y: string; size: string })[]>([]);
    const [activeDays, setActiveDays] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heatmap, garden] = await Promise.all([
                    api.getProfileHeatmap(),
                    api.getProfileGarden()
                ]);

                // -------------------------------------------------------------
                // 1. Process Heatmap Data (GitHub Style)
                // -------------------------------------------------------------
                const today = new Date();

                // Calculate start date: Exactly 32 weeks ago (reduced from 34 to fix overflow)
                const startDate = new Date(today);
                startDate.setDate(today.getDate() - (32 * 7));

                // Adjust start date to the nearest preceding Sunday to align the grid
                const dayOfWeek = startDate.getDay(); // 0 = Sunday
                startDate.setDate(startDate.getDate() - dayOfWeek);

                // Initialize Days Grid
                const daysMap = new Map<string, api.HeatmapDay>();
                heatmap.forEach((d) => daysMap.set(d.date, d));

                let activeDaysCount = 0;
                let iterDate = new Date(startDate);

                // Group by weeks for better layout control
                const weeks: { date: string; colorClass: string; count: number }[][] = [];
                let currentWeek: { date: string; colorClass: string; count: number }[] = [];

                while (iterDate <= today) {
                    const dateStr = iterDate.toISOString().split('T')[0];
                    const dayData = daysMap.get(dateStr);
                    const count = dayData ? dayData.count : 0;

                    let colorClass = 'bg-[var(--paper-gray)]'; // 0 (Empty)

                    if (count > 0) {
                        activeDaysCount++;
                        if (count >= 50) colorClass = 'bg-[#B05030]';      // 50+ (Full Dark)
                        else if (count >= 30) colorClass = 'bg-[#D97757]'; // 30-49 (Medium)
                        else if (count >= 10) colorClass = 'bg-[#E5A087]'; // 10-29 (Medium-Light)
                        else colorClass = 'bg-[#F2DCD6]';                  // 1-9 (Light)
                    }

                    currentWeek.push({
                        date: dateStr,
                        colorClass,
                        count
                    });

                    // If Saturday, push week and start new
                    if (iterDate.getDay() === 6) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                    }

                    // Next day
                    iterDate.setDate(iterDate.getDate() + 1);
                }

                // Push partial last week if exists
                if (currentWeek.length > 0) {
                    weeks.push(currentWeek);
                }

                setHeatmapData(weeks);
                setActiveDays(activeDaysCount);


                // -------------------------------------------------------------
                // 2. Process Garden Grid (Clean Layout)
                // -------------------------------------------------------------
                const COLS = 3;
                const ROWS = 3;
                const validSlots: { r: number, c: number }[] = [];

                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (r === 0 && c === 0) continue;
                        validSlots.push({ r, c });
                    }
                }

                const shuffledSlots = validSlots.sort(() => 0.5 - Math.random());
                const gardenSubset = garden.slice(0, 8);

                const newWords = gardenSubset.map((w, i) => {
                    const slot = shuffledSlots[i];
                    const PADDING_LEFT = 10;
                    const PADDING_RIGHT = 10;
                    const PADDING_TOP = 30;
                    const PADDING_BOTTOM = 10;

                    const safeWidth = 100 - PADDING_LEFT - PADDING_RIGHT;
                    const safeHeight = 100 - PADDING_TOP - PADDING_BOTTOM;

                    const cellWidth = safeWidth / COLS;
                    const cellHeight = safeHeight / ROWS;

                    const centerX = PADDING_LEFT + slot.c * cellWidth + cellWidth / 2;
                    const centerY = PADDING_TOP + slot.r * cellHeight + cellHeight / 2;

                    const jitterX = (Math.random() - 0.5) * (cellWidth * 0.4);
                    const jitterY = (Math.random() - 0.5) * (cellHeight * 0.4);

                    const x = Math.max(PADDING_LEFT, Math.min(100 - PADDING_RIGHT, centerX + jitterX));
                    const y = Math.max(PADDING_TOP, Math.min(100 - PADDING_BOTTOM, centerY + jitterY));

                    const sizes = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
                    const size = sizes[Math.floor(Math.random() * sizes.length)];

                    return { ...w, x: `${x}%`, y: `${y}%`, size };
                });
                setGardenWords(newWords);

            } catch (error) {
                console.error("Failed to fetch profile data", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="flex flex-col items-center w-full max-w-3xl animate-fade-in">
            <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-normal text-[#1A1A1A] mb-4 tracking-tight" style={{ lineHeight: '1' }}>Your Journey</h1>
                <p className="text-[#888] text-sm font-light tracking-wider mt-3">
                    每一次坚持，都是记忆的生长。
                </p>
            </header>

            <section className="bg-white rounded-[20px] border border-[#E6E6E3] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] w-full mb-10">
                <div className="flex justify-between items-baseline mb-6">
                    <h2 className="font-serif text-2xl text-[#333333]">Study Streak</h2>

                    <div className="flex items-center gap-2 text-xs text-[#888888] font-light">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[var(--paper-gray)]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#F2DCD6]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#E5A087]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#D97757]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#B05030]"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>

                <div className="flex flex-col w-full">
                    <div className="flex flex-row ml-8 mb-2 gap-1 text-xs text-[#888] h-4">
                        {heatmapData.map((week, i) => {
                            if (!week || week.length === 0) return <div key={i} className="w-3 sm:w-4"></div>;
                            const firstDayDate = new Date(week[0].date);
                            const isNewMonth = i === 0 || new Date(heatmapData[i - 1][0].date).getMonth() !== firstDayDate.getMonth();
                            return (
                                <div key={i} className="w-3 sm:w-4 text-[10px] overflow-visible whitespace-nowrap relative">
                                    {isNewMonth ? (
                                        <span className="absolute left-0">{firstDayDate.toLocaleString('en-US', { month: 'short' })}</span>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-row w-full">
                        <div className="flex flex-col gap-1 mr-2 mt-[0px] text-[10px] text-[#888] h-full justify-start pt-[0px] leading-4">
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">Mon</div>
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">Wed</div>
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">Fri</div>
                            <div className="h-3 sm:h-4"></div>
                        </div>

                        <div className="flex flex-row gap-1 overflow-x-auto no-scrollbar pb-2">
                            {heatmapData.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {week.map((day) => (
                                        <div
                                            key={day.date}
                                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] transition-all duration-300 hover:scale-125 cursor-pointer group relative ${day.colorClass} z-0 hover:z-20`}
                                        >
                                            <div className={`absolute bottom-full mb-2 px-2 py-1 bg-[#2A2A29] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-sm
                                                ${weekIndex < 2 ? 'left-0' : (weekIndex >= heatmapData.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2')}
                                            `}>
                                                {day.date}: {day.count} cards
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-[#F0F0F0] text-center">
                    <p className="text-[#888888] font-serif italic text-sm tracking-wide">
                        "You practiced {activeDays} days in the last 8 months."
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
