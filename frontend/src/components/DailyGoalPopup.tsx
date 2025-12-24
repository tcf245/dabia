import React, { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import {
    X, Check, Maximize2, MoveVertical, ArrowUp,
    Clock, Star, CheckCircle2
} from 'lucide-react';
import { getDailySummary } from '../services/api';
import type { DailyStats } from '../services/api';

interface DailyGoalPopupProps {
    isOpen: boolean;
    onClose: () => void;
    initialStats?: DailyStats;
}

const DailyGoalPopup: React.FC<DailyGoalPopupProps> = ({ isOpen, onClose, initialStats }) => {
    const [stats, setStats] = useState<DailyStats | null>(initialStats || null);

    useEffect(() => {
        if (isOpen && !stats && !initialStats) {
            getDailySummary()
                .then(setStats)
                .catch(console.error);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins} 分钟, ${secs} 秒`;
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-stone-900/20 backdrop-blur-[2px] transition-opacity" />

            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full max-w-md bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#E6E6E3] p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <h2 className="font-serif text-2xl text-[#333333]">
                            {todayStr}
                        </h2>
                        <button onClick={onClose} className="text-[#888888] hover:text-[#2A2A29] transition-colors p-1">
                            <X size={20} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Celebration Banner */}
                    <div className="flex items-start gap-4 p-4 bg-[#F9F9F8] rounded-[20px] border border-[#E6E6E3]">
                        <div className="bg-[#FFFFFF] p-2.5 rounded-full text-[#D97757] shadow-sm shrink-0 border border-[#E6E6E3]">
                            <Check size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="font-serif text-xl text-[#2A2A29] mb-1">你做得很棒!</h3>
                            <p className="font-sans text-sm text-[#2A2A29] font-medium">完成 {stats?.total_answered || 50} 张词卡</p>
                            <p className="font-sans text-xs text-[#888888] mt-1 font-light tracking-wide">50张词卡是最佳学习的建议目标。</p>
                        </div>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-4">
                        {/* Primary Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatBox
                                icon={<Maximize2 size={16} strokeWidth={1.5} className="text-[#D97757]" />}
                                label="要学的单词"
                                value={stats?.to_learn_count ?? 0}
                            />
                            <StatBox
                                icon={<MoveVertical size={16} strokeWidth={1.5} className="text-[#D97757]" />}
                                label="已学单词"
                                value={stats?.learned_count ?? 0}
                            />
                        </div>

                        {/* Detailed Stats List */}
                        <div className="bg-[#F9F9F8] rounded-[20px] p-1 border border-[#E6E6E3]">
                            <StatRow
                                icon={<ArrowUp size={16} strokeWidth={1.5} className="text-[#888888]" />}
                                label="单词已强化"
                                value={stats?.reinforced_count ?? 0}
                            />
                            <StatRow
                                icon={<Clock size={16} strokeWidth={1.5} className="text-[#888888]" />}
                                label="总耗时"
                                value={formatTime(stats?.total_time_seconds || 0)}
                            />
                            <StatRow
                                icon={<Star size={16} strokeWidth={1.5} className="text-[#888888]" />}
                                label="新单词"
                                value={stats?.new_words_count ?? 0}
                            />
                            <StatRow
                                icon={<CheckCircle2 size={16} strokeWidth={1.5} className="text-[#888888]" />}
                                label="正确率"
                                value={`${Math.round(stats?.accuracy ?? 0)}%`}
                                isLast
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-[#D97757] text-white font-medium py-3 rounded-full hover:bg-[#B05030] transition-colors shadow-sm"
                    >
                        继续
                    </button>

                </DialogPanel>
            </div>
        </Dialog>
    );
};

// Helper Component for Grid Box
const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => {
    return (
        <div className="flex flex-col items-start gap-2 p-4 bg-white rounded-[20px] border border-[#E6E6E3] shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
            <div className="p-1.5 bg-[#F9F9F8] rounded-full border border-[#E6E6E3]">
                {icon}
            </div>
            <div>
                <p className="font-sans text-xs text-[#888888] font-light mb-0.5">{label}</p>
                <p className="font-serif text-xl text-[#2A2A29]">{value}</p>
            </div>
        </div>
    );
};

// Helper Component for Row
const StatRow: React.FC<{ icon: React.ReactNode; label: string; value: string | number; isLast?: boolean }> = ({ icon, label, value, isLast }) => {
    return (
        <div className={`flex items-center justify-between p-3.5 ${!isLast ? 'border-b border-[#E6E6E3]' : ''}`}>
            <div className="flex items-center gap-3">
                <div className="text-[#888888]">{icon}</div>
                <span className="font-sans text-sm text-[#2A2A29]">{label}</span>
            </div>
            <span className="font-mono text-sm text-[#888888]">{value}</span>
        </div>
    );
};

export default DailyGoalPopup;
