import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import ProficiencyIndicator from './ProficiencyIndicator';
import ProficiencyLevelModal from './ProficiencyLevelModal';
import { useFlashcardLogic, UseFlashcardLogicProps } from '../hooks/useFlashcardLogic';

// Re-export or use the type from the hook to ensure consistency
type FlashcardProps = UseFlashcardLogicProps;

const Flashcard: React.FC<FlashcardProps> = (props) => {
  const { card, mode = 'quiz' } = props;
  // Safely access onContinue only when needed, but TS will enforce it via props
  const onContinue = (props as any).onContinue;

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    userInput,
    setUserInput,
    answerState,
    inputRef,
    handleCheck,
    handleKeyPress
  } = useFlashcardLogic(props);

  const sentenceParts = card.sentence_template.split('__');

  const getInputClasses = () => {
    if (answerState === 'unanswered') {
      return 'border-input focus:border-primary';
    }
    return answerState === 'correct'
      ? 'border-primary bg-primary/10'
      : 'border-destructive bg-destructive/10';
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl border border-[#E6E6E3] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 mb-4">
        {/* Hint and Proficiency Indicator */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex flex-col gap-4">
            <ProficiencyIndicator
              level={card.proficiency_level || 1}
              onClick={() => setIsModalOpen(true)}
            />
            <div className="flex items-center gap-3 text-[#2A2A29]">
              <div className="w-8 h-8 rounded-lg bg-[#F2F0EF] flex items-center justify-center text-base">
                <span>💬</span>
              </div>
              <span className="text-sm font-light">{card.target.hint}</span>
            </div>
          </div>
        </div>

        {/* Sentence and Input */}
        <div className="mb-8">
          <div className="text-3xl text-foreground font-serif font-light leading-relaxed text-center">
            {mode === 'review' ? (
              <span>
                {sentenceParts[0]}
                <span className="font-serif font-medium text-primary mx-1 border-b-2 border-primary/30 px-1">
                  {card.target.word}
                </span>
                {sentenceParts[1]}
              </span>
            ) : (
              <>
                {sentenceParts[0]}
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`inline-block mx-2 px-2 py-1 border-b-2 focus:outline-none text-center transition-colors duration-300 ${getInputClasses()}`}
                  style={{ width: `${Math.max(card.target.word.length * 1.2, 8)}ch` }}
                  disabled={answerState === 'correct'}
                  placeholder=""
                />
                {sentenceParts[1]}
              </>
            )}
          </div>
        </div>

        {/* Feedback Area */}
        <div className="h-12 flex items-center justify-center">
          {mode === 'review' ? (
            <div className="flex items-center gap-2 text-primary font-semibold text-xl">
              <span>{card.reading}</span>
            </div>
          ) : (
            <AnimatePresence>
              {answerState === 'incorrect' && (
                <motion.div
                  key="incorrect"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 text-muted-foreground font-semibold"
                >
                  <X size={20} />
                  <span>{card.reading}</span>
                </motion.div>
              )}
              {answerState === 'correct' && (
                <motion.div
                  key="correct"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 text-primary font-semibold"
                >
                  <Check size={20} />
                  <span>Correct!</span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Translation and Submit Button */}
        <div className="mt-6 pt-6 border-t border-dashed border-[#E6E6E3] flex justify-between items-center">
          <span className="text-base font-light text-[#74746E] text-left">{card.sentence_translation}</span>
          {mode !== 'review' && (answerState === 'unanswered' || answerState === 'incorrect') && (
            <button
              onClick={handleCheck}
              disabled={!userInput.trim()}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97757] disabled:bg-[#F2F0EF] disabled:text-[#999] disabled:cursor-not-allowed bg-[#D97757] text-white shadow-sm hover:bg-[#C96642] h-10 rounded-xl px-6 text-sm"
            >
              Submit
            </button>
          )}
          {mode === 'review' && (
            <button
              onClick={onContinue}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D97757] bg-[#D97757] text-white shadow-sm hover:bg-[#C96642] h-10 rounded-xl px-6 text-sm"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <ProficiencyLevelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Flashcard;
