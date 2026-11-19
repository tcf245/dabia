import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useI18n } from '../i18n/LanguageProvider';
import WordGarden from '../components/garden/WordGarden';

// 2026-11-16 is a Monday; used only to get localized weekday names.
const weekday = (locale: string, offset: number) =>
    new Date(Date.UTC(2026, 10, 16 + offset)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });

const Profile = () => {

    const [heatmapData, setHeatmapData] = useState<{ date: string; colorClass: string; count: number }[][]>([]);
    const [gardenWords, setGardenWords] = useState<api.GardenWord[]>([]);
    const [activeDays, setActiveDays] = useState(0);
    const { language, messages } = useI18n();
    const t = messages.profile;

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            try {
                const [heatmap, garden] = await Promise.all([
                    api.getProfileHeatmap(),
                    api.getProfileGarden()
                ]);
                if (!active) return;

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
                const iterDate = new Date(startDate);

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
                setGardenWords(garden);

            } catch (error) {
                console.error("Failed to fetch profile data", error);
            }
        };

        fetchData();

        return () => {
            active = false;
        };
    }, [language]);

    return (
        <div className="flex flex-col items-center w-full max-w-3xl animate-fade-in">
            <header className="text-center mb-12">
                <h1 className="font-serif text-5xl font-normal text-[#1A1A1A] mb-4 tracking-tight" style={{ lineHeight: '1' }}>{t.title}</h1>
                <p className="text-[#888] text-sm font-light tracking-wider mt-3">
                    {t.subtitle}
                </p>
            </header>

            <section className="bg-white rounded-[20px] border border-[#E6E6E3] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] w-full mb-10">
                <div className="flex justify-between items-baseline mb-6">
                    <h2 className="font-serif text-2xl text-[#333333]">{t.streak}</h2>

                    <div className="flex items-center gap-2 text-xs text-[#888888] font-light">
                        <span>{t.less}</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[var(--paper-gray)]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#F2DCD6]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#E5A087]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#D97757]"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] bg-[#B05030]"></div>
                        </div>
                        <span>{t.more}</span>
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
                                        <span className="absolute left-0">{firstDayDate.toLocaleString(messages.locale, { month: 'short' })}</span>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-row w-full">
                        <div className="flex flex-col gap-1 mr-2 mt-[0px] text-[10px] text-[#888] h-full justify-start pt-[0px] leading-4">
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">{weekday(messages.locale, 0)}</div>
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">{weekday(messages.locale, 2)}</div>
                            <div className="h-3 sm:h-4"></div>
                            <div className="h-3 sm:h-4 flex items-center">{weekday(messages.locale, 4)}</div>
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
                                                {t.dayCards(day.date, day.count)}
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
                        {t.practicedDays(activeDays)}
                    </p>
                </div>
            </section>

            <WordGarden words={gardenWords} />
        </div>
    );
};

export default Profile;
