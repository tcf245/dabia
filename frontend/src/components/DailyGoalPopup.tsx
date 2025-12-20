import React, { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import {
    X, Check, Maximize2, MoveVertical, ArrowUp, AlignJustify,
    Clock, Star, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { getDailySummary } from '../api/stats';
import type { DailyStats } from '../api/stats';

interface DailyGoalPopupProps {
    isOpen: boolean;
    onClose: () => void;
    initialStats?: DailyStats;
}

const DailyGoalPopup: React.FC<DailyGoalPopupProps> = ({ isOpen, onClose, initialStats }) => {
    const [stats, setStats] = useState<DailyStats | null>(initialStats || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && !stats && !initialStats) {
            setLoading(true);
            getDailySummary()
                .then(setStats)
                .catch(console.error)
                .finally(() => setLoading(false));
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
            <DialogBackdrop className="fixed inset-0 bg-black/30" />

            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-medium text-slate-800">
                            {todayStr}
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Celebration Banner */}
                    <div className="flex items-start gap-4 py-2">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600 shrink-0">
                            <Check size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">你做得很棒!</h3>
                            <p className="text-slate-600 font-medium">完成{stats?.total_answered || 50}张词卡</p>
                            <p className="text-slate-500 text-sm mt-1">50张词卡是最佳学习的建议目标。</p>
                        </div>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-1">
                        <StatRow icon={<Maximize2 size={18} className="text-teal-600" />} label="要学的单词" value={stats?.to_learn_count ?? 0} />
                        <StatRow icon={<MoveVertical size={18} className="text-cyan-600" />} label="已学单词" value={stats?.learned_count ?? 0} />
                        <StatRow icon={<ArrowUp size={18} className="text-teal-700" />} label="单词已强化" value={stats?.reinforced_count ?? 0} />
                    </div>

                    <div className="py-2">
                        <div className="items-center justify-between flex p-3 bg-white">
                            <div className="flex items-center gap-3">
                                <AlignJustify size={18} className="text-cyan-400" />
                                <span className="text-slate-700 font-medium">已答卡片</span>
                            </div>
                            <span className="text-slate-600 font-medium">{stats?.total_answered ?? 0}</span>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="py-1">
                        <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                                <Clock size={18} className="text-slate-600" />
                                <span className="text-slate-700 font-medium">总耗时</span>
                            </div>
                            <span className="text-slate-600">{formatTime(stats?.total_time_seconds || 0)}</span>
                        </div>
                    </div>

                    {/* Bottom Stats */}
                    <div className="space-y-1 bg-slate-50 rounded-xl overflow-hidden divide-y divide-slate-100">
                        <StatRow icon={<Star size={18} className="text-orange-400" />} label="新单词" value={stats?.new_words_count ?? 0} />
                        <StatRow icon={<CheckCircle2 size={18} className="text-green-500" />} label="正确率" value={`${Math.round(stats?.accuracy ?? 0)}%`} />
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 text-white font-medium py-3 rounded-xl hover:bg-slate-900 transition-colors mt-4"
                    >
                        继续
                    </button>

                </DialogPanel>
            </div>
        </Dialog>
    );
};

// Helper Component for Row
const StatRow: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{icon}</div>
                <span className="text-slate-700 font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">{value}</span>
                <ChevronDown size={16} className="text-slate-400" />
            </div>
        </div>
    );
};

export default DailyGoalPopup;
