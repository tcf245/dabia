import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Card as FlashcardDataType } from '../services/api';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
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
    const isCorrect = userInput.trim().toLowerCase() === card.target.word.toLowerCase();
    if (isCorrect) {
      setAnswerState('correct');
      playAudioAndAdvance(true);
    } else {
      setAnswerState('incorrect');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (answerState === 'unanswered') {
      handleCheck();
    } else if (answerState === 'incorrect') {
      if (userInput.trim().toLowerCase() === card.target.word.toLowerCase()) {
        setAnswerState('correct'); // Show correct UI
        playAudioAndAdvance(false); // But submit as false because it was a correction
      } else {
        setUserInput('');
      }
    }
  };

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
      <div className="bg-card rounded-xl shadow-lg p-8 mb-4 border">
        {/* Hint */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg">
              <span>💬</span>
            </div>
            <span className="text-sm font-medium">{card.target.hint}</span>
          </div>
        </div>

        {/* Sentence and Input */}
        <div className="mb-8">
          <div className="text-3xl text-foreground font-light leading-relaxed text-center">
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
          </div>
        </div>

        {/* Feedback Area */}
        <div className="h-12 flex items-center justify-center">
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
        </div>
        
        {/* Translation and Submit Button */}
        <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
            <span className="text-lg font-medium text-muted-foreground text-left">{card.sentence_translation}</span>
            {answerState === 'unanswered' && (
              <button
                onClick={handleCheck}
                disabled={!userInput.trim()}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-[#c96442] text-white shadow hover:bg-[#b45738] h-8 rounded-md px-3 text-xs"
              >
                Submit
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;


