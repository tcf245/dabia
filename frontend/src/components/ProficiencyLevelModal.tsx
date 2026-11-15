import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useI18n } from '../i18n/LanguageProvider';

interface ProficiencyLevelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProficiencyLevelModal: React.FC<ProficiencyLevelModalProps> = ({ isOpen, onClose }) => {
    useEscapeKey(isOpen, onClose);
    const { messages } = useI18n();
    const t = messages.proficiency;
    if (!isOpen) return null;

    const levels = [
        { level: 5, text: t.levels[5], color: 'bg-[#D97757]' },
        { level: 4, text: t.levels[4], color: 'bg-[#D97757]' },
        { level: 3, text: t.levels[3], color: 'bg-[#D97757]' },
        { level: 2, text: t.levels[2], color: 'bg-[#E5A087]' },
        { level: 1, text: t.levels[1], color: 'bg-[#F2DCD6]' },
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
                        <h2 className="font-serif text-2xl text-[#333333] mb-4">{t.modalTitle}</h2>
                        <p className="text-sm text-[#888888] font-light leading-relaxed">
                            {t.modalBody}
                        </p>
                        <p className="text-sm text-[#888888] font-light mt-4">
                            {t.modalFooter}
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
                        aria-label={messages.common.close}
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
