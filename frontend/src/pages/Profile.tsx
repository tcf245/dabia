const Profile = () => {

    // --- MOCK DATA FOR HEATMAP (104 items) ---
    // In a real app, this would come from the backend.
    const days = Array.from({ length: 104 }, (_, i) => {
        const rand = Math.random();
        let colorClass = 'bg-[var(--paper-gray)]';
        // Mocking the probability from the design file
        if (rand > 0.6) colorClass = 'bg-[var(--brand-light)]';
        if (rand > 0.85) colorClass = 'bg-[var(--brand)]';
        return { id: i, colorClass };
    });

    // --- MOCK DATA FOR GARDEN ---
    const words = [
        { text: '約束', romaji: 'Yakusoku', type: 'review', x: '10%', y: '30%', size: 'text-2xl' },
        { text: '猫', romaji: 'Neko', type: 'learned', x: '25%', y: '60%', size: 'text-xl' },
        { text: '素晴らしい', romaji: 'Subarashii', type: 'review', x: '60%', y: '20%', size: 'text-3xl' },
        { text: '海', romaji: 'Umi', type: 'learned', x: '80%', y: '50%', size: 'text-lg' },
        { text: '冒険', romaji: 'Bouken', type: 'learned', x: '15%', y: '75%', size: 'text-xl' },
        { text: '愛', romaji: 'Ai', type: 'review', x: '50%', y: '70%', size: 'text-4xl' },
        { text: '旅行', romaji: 'Ryokou', type: 'learned', x: '75%', y: '80%', size: 'text-xl' },
        { text: '心', romaji: 'Kokoro', type: 'learned', x: '45%', y: '45%', size: 'text-lg' },
    ];

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
                    {days.map((day) => (
                        <div
                            key={day.id}
                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[3px] transition-all duration-300 hover:scale-125 cursor-pointer ${day.colorClass}`}
                            title={`Day ${day.id + 1}`}
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
                    {words.map((word, i) => {
                        // Animation customization per item mimicking the design's inline style
                        const duration = 3 + (i % 4);
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
