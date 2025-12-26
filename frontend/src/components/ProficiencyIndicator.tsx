import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProficiencyIndicatorProps {
    level: number; // 1-5
    onClick: () => void;
}

const PROFICIENCY_TEXTS: Record<number, string> = {
    1: '没见过的新单词！',
    2: '这个单词需要多练练！',
    3: '就要学起来了！',
    4: '唾手可得！',
    5: '记忆满点！',
};

const PROFICIENCY_COLORS: Record<number, string> = {
    1: 'bg-[#F2DCD6]',
    2: 'bg-[#E5A087]',
    3: 'bg-[#D97757]',
    4: 'bg-[#D97757]',
    5: 'bg-[#D97757]',
};

const PROFICIENCY_SEGMENTS = [1, 2, 3, 4, 5];

const ProficiencyIndicator: React.FC<ProficiencyIndicatorProps> = ({ level, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            data-testid="proficiency-indicator-container"
            className="inline-flex items-center gap-3 cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* 5-segment bar */}
            <div className="flex" style={{ gap: '6px' }}>
                {PROFICIENCY_SEGMENTS.map((idx) => {
                    const isFilled = idx <= level;
                    return (
                        <div
                            key={idx}
                            className={`proficiency-segment rounded-full transition-all duration-300 ${isFilled
                                ? `proficiency-segment-filled ${PROFICIENCY_COLORS[idx]}`
                                : 'bg-[#F2F0EF]'
                                }`}
                            style={{ width: '16px', height: '4px' }}
                        />
                    );
                })}
            </div>

            {/* Hover text */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-xs font-sans text-[#74746E] font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                            {PROFICIENCY_TEXTS[level]}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProficiencyIndicator;
