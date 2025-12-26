import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Card as FlashcardDataType } from '../services/api';
import ProficiencyIndicator from './ProficiencyIndicator';
import ProficiencyLevelModal from './ProficiencyLevelModal';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
  mode?: 'quiz' | 'review';
  onContinue?: () => void;
}

import { validateAnswer } from '../utils/validation';

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit, mode = 'quiz', onContinue }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state for new card
  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setStartTime(Date.now());
    inputRef.current?.focus();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [card]);

  // Handle global keyboard shortcuts for this component


  const handleContinue = (isCorrect: boolean) => {
    const responseTime = Date.now() - startTime;
    onSubmit(card.card_id, isCorrect, responseTime);
  };

  const playAudioAndAdvance = async (isCorrect: boolean) => {
    if (card.sentence_audio_url) {
      const audio = new Audio(card.sentence_audio_url);
      audioRef.current = audio;
      audio.onended = () => handleContinue(isCorrect);
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio play failed:", err);
        handleContinue(isCorrect); // Advance even if audio fails
      }
    } else {
      setTimeout(() => handleContinue(isCorrect), 800); // Wait a bit before advancing
    }
  };

  const handleCheck = () => {
    const isCorrect = validateAnswer(userInput, card.target.word, card.reading);
    if (isCorrect) {
      setAnswerState('correct');
      playAudioAndAdvance(true);
    } else {
      setAnswerState('incorrect');
      setUserInput(''); // Clear input on incorrect answer
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (answerState === 'unanswered') {
      handleCheck();
    } else if (answerState === 'incorrect') {
      if (validateAnswer(userInput, card.target.word, card.reading)) {
        setAnswerState('correct'); // Show correct UI
        playAudioAndAdvance(false); // But submit as false because it was a correction
      } else {
        setUserInput('');
      }
    }
  };

  // Handle global keyboard shortcuts for this component
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (mode === 'review' && onContinue) {
          onContinue();
        } else if (mode === 'quiz' && answerState === 'unanswered') {
          // Only submit if input is not empty, similar to button disabled state
          if (userInput.trim()) {
            handleCheck();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onContinue, answerState, userInput, handleCheck]);

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
            <div className="flex items-center gap-3 text-[#74746E]">
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


