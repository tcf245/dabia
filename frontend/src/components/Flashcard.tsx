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
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state for new card
  useEffect(() => {
    setUserInput('');
    setShowAnswer(false);
    setStartTime(Date.now());
    inputRef.current?.focus();
  }, [card]);

  const handleCheck = () => {
    if (showAnswer) return;
    setShowAnswer(true);
  };

  const handleNext = (isCorrect: boolean) => {
    const responseTime = Date.now() - startTime;
    onSubmit(card.card_id, isCorrect, responseTime);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!showAnswer) {
        handleCheck();
      }
    }
  };

  const isUserInputCorrect = userInput.trim().toLowerCase() === card.target.word.toLowerCase();
  const sentenceParts = card.sentence_template.split('__');

  const getInputClasses = () => {
    if (!showAnswer) {
      return 'border-input focus:border-primary';
    }
    return isUserInputCorrect 
      ? 'border-primary bg-primary/10' 
      : 'border-destructive bg-destructive/10';
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Main Card */}
      <div className="bg-card rounded-xl shadow-lg p-8 mb-4 border">
        {/* Hint/Reading */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-lg">
              <span>💬</span>
            </div>
            <span className="text-sm font-medium">{card.reading || card.target.hint}</span>
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
              disabled={showAnswer}
              placeholder=""
            />
            {sentenceParts[1]}
          </div>
        </div>

        {/* Answer Expansion */}
        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-border overflow-hidden"
            >
              <div className="mb-4">
                <span className="text-lg font-medium text-foreground">{card.sentence_translation}</span>
              </div>
              {!isUserInputCorrect && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive-foreground">
                    Correct answer: <span className="font-bold">{card.target.word}</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-3">
        {!showAnswer ? (
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Check Answer
          </button>
        ) : (
          <>
            <button
              onClick={() => handleNext(false)}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <X size={20} />
              Incorrect
            </button>
            <button
              onClick={() => handleNext(true)}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Correct
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Flashcard;


