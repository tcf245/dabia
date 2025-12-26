import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ProficiencyLevelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProficiencyLevelModal: React.FC<ProficiencyLevelModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const levels = [
        { level: 5, text: '记忆满点！', color: 'bg-[#D97757]' },
        { level: 4, text: '唾手可得！', color: 'bg-[#D97757]' },
        { level: 3, text: '就要学起来了！', color: 'bg-[#D97757]' },
        { level: 2, text: '这个单词需要多练练！', color: 'bg-[#E5A087]' },
        { level: 1, text: '没见过的新单词！', color: 'bg-[#F2DCD6]' },
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full p-8 relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="font-serif text-2xl text-[#333333] mb-4">掌握你的每日词汇</h2>
                        <p className="text-sm text-[#888888] font-light leading-relaxed">
                            Dabia 记录你的每一次练习。通过智能间隔算法，我们能识别你对每个单词的熟悉程度，并在最适合的时间提醒你复习。
                        </p>
                        <p className="text-sm text-[#888888] font-light mt-4">
                            让记忆像细胞一样生长，直至达成母语般的条件反射。
                        </p>
                    </div>

                    <div className="h-[1px] bg-dashed bg-[#E6E6E3] mb-8" />

                    {/* Levels List */}
                    <div className="space-y-6">
                        {levels.map((item) => (
                            <div key={item.level} className="flex items-center gap-6">
                                <div
                                    data-testid="modal-proficiency-segments"
                                    className="flex"
                                    style={{ gap: '6px' }}
                                >
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <div
                                            key={s}
                                            className={`rounded-full ${s <= item.level ? item.color : 'bg-[#F2F0EF]'
                                                }`}
                                            style={{ width: '16px', height: '4px' }}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-sans text-[#2A2A29]">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-6 right-6 p-2 text-[#999999] hover:text-[#2A2A29] transition-colors rounded-full hover:bg-[#F2F0EF]"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProficiencyLevelModal;
