import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CornerDownLeft, Check, X } from 'lucide-react';
import type { Card as FlashcardDataType } from '../services/api';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setStartTime(Date.now());
    inputRef.current?.focus();
  }, [card]);

  const handleCheck = () => {
    if (!userInput.trim()) return;
    const isCorrect = userInput.trim().toLowerCase() === card.target.word.toLowerCase();
    if (isCorrect) {
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
      setUserInput(''); // Clear input to force re-typing
    }
  };

  const handleContinue = () => {
    if (answerState === 'incorrect' && userInput.trim().toLowerCase() !== card.target.word.toLowerCase()) {
      // Add a little shake animation for feedback
      // This part can be enhanced later. For now, just prevent continuation.
      return;
    }
    const responseTime = Date.now() - startTime;
    const wasOriginallyCorrect = answerState === 'correct';
    onSubmit(card.card_id, wasOriginallyCorrect, responseTime);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (answerState === 'unanswered') {
      handleCheck();
    } else {
      handleContinue();
    }
  };

  const sentenceParts = card.sentence_template.split('__');

  const getBorderColor = () => {
    if (answerState === 'correct') return 'ring-success';
    if (answerState === 'incorrect') return 'ring-destructive';
    return 'ring-transparent';
  };

  const getInputColor = () => {
    // When incorrect, the user is typing the correct answer, so it should look neutral until submitted for continuation.
    if (answerState === 'correct') return 'text-success';
    if (answerState === 'incorrect') return 'text-foreground'; // User is re-typing
    return 'text-primary';
  }

  const ActionButton = () => {
    const isContinueDisabled = answerState === 'incorrect' && userInput.trim().toLowerCase() !== card.target.word.toLowerCase();
    return (
      <button
        onClick={answerState === 'unanswered' ? handleCheck : handleContinue}
        disabled={(answerState === 'unanswered' && !userInput.trim()) || isContinueDisabled}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
      >
        {answerState === 'unanswered' ? 'Check' : 'Continue'}
        <CornerDownLeft size={18} />
      </button>
    );
  };

  return (
    <div className={`bg-card rounded-xl shadow-lg w-full max-w-2xl ring-2 ${getBorderColor()} transition-all duration-300`}>
      <div className="p-8 md:p-10">
        <div className="flex items-center text-muted-foreground mb-8">
          <MessageCircle className="mr-3" size={20} />
          <span>{card.reading}</span>
        </div>

        <div className="text-3xl md:text-4xl text-foreground mb-10 leading-relaxed flex items-center flex-wrap justify-center text-center">
          {sentenceParts[0]}
          <div className="inline-block mx-2 relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={answerState === 'correct'}
              className={`bg-transparent border-b-2 focus:outline-none text-center text-3xl md:text-4xl w-40 transition-colors duration-300 ${getInputColor()} ${answerState === 'unanswered' ? 'border-input focus:border-primary' : 'border-transparent'}`}
              autoFocus
            />
          </div>
          {sentenceParts[1]}
        </div>
        
        <AnimatePresence>
          {answerState === 'incorrect' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center mb-6"
            >
              <div className="flex items-center gap-2 text-destructive font-semibold text-lg">
                <X size={22} /> 
                <span>Correct answer: {card.target.word}</span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">Please type the correct answer to continue.</p>
            </motion.div>
          )}
          {answerState === 'correct' && (
             <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center mb-6"
            >
              <div className="flex items-center gap-2 text-success font-semibold text-lg">
                <Check size={22} />
                <span>Correct!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end mt-8">
          <ActionButton />
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
