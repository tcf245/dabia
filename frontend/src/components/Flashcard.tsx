import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CornerDownLeft } from 'lucide-react';
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
    } else {
      setAnswerState('incorrect');
    }
  };

  // Auto-advance on correct answer
  useEffect(() => {
    if (answerState === 'correct') {
      playAudioAndAdvance(true);
    }
  }, [answerState]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (answerState === 'unanswered') {
      handleCheck();
    } else if (answerState === 'incorrect') {
      // If user re-types the correct answer after being wrong
      if (userInput.trim().toLowerCase() === card.target.word.toLowerCase()) {
        playAudioAndAdvance(false); // Submitted as incorrect, but advance
      } else {
        // Shake animation or some other feedback could be added here
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
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-lg">
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
              className={`inline-block mx-2 px-4 py-1 border-b-2 focus:outline-none text-center min-w-[150px] transition-colors duration-300 ${getInputClasses()}`}
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
                className="flex items-center gap-2 text-destructive font-semibold"
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
        
        {/* Translation (Always Visible) */}
        <div className="mt-6 pt-6 border-t border-border text-center">
            <span className="text-lg font-medium text-muted-foreground">{card.sentence_translation}</span>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="h-16">
        {answerState === 'unanswered' && (
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Check Answer
          </button>
        )}
      </div>
    </div>
  );
};

export default Flashcard;


