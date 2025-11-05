import React, { useState, useEffect, useRef } from 'react';
import type { Card as FlashcardDataType } from '../services/api';
import { FiMessageSquare } from 'react-icons/fi'; // Using react-icons for a nice icon

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state and focus input when a new card is passed in
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
      setUserInput(''); // Clear input on incorrect answer
    }
  };

  const handleContinue = () => {
    if (answerState === 'incorrect' && userInput.trim().toLowerCase() !== card.target.word.toLowerCase()) {
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
  }

  const sentenceParts = card.sentence_template.split('__');

  const borderColorClass = () => {
    if (answerState === 'correct') return 'border-green-500';
    if (answerState === 'incorrect') return 'border-red-500';
    return 'border-gray-200';
  };

  const isContinueDisabled = answerState === 'incorrect' && userInput.trim().toLowerCase() !== card.target.word.toLowerCase();

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 md:p-12 w-full ${borderColorClass()}`}>
      {/* Header with reading */}
      <div className="flex items-center text-gray-500 mb-8">
        <FiMessageSquare className="mr-3 text-lg" />
        <span>{card.reading}</span>
      </div>

      {/* Sentence with seamless input */}
      <div className="text-3xl md:text-4xl text-gray-800 mb-10 leading-relaxed flex items-center flex-wrap">
        {sentenceParts[0]}
        <div className="inline-block mx-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={answerState === 'correct'}
            className="bg-transparent border-b-2 focus:outline-none text-center text-3xl md:text-4xl w-32"
            style={{ borderColor: answerState === 'incorrect' ? '#EF4444' : answerState === 'correct' ? '#22C55E' : '#E5E7EB' }}
            autoFocus
          />
        </div>
        {sentenceParts[1]}
      </div>

      {/* Correct answer display */}
      {answerState === 'incorrect' && (
        <div className="text-red-500 mb-6 text-center">
          Correct answer: <span className="font-bold">{card.target.word}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end mt-8">
        {answerState === 'unanswered' ? (
          <button 
            onClick={handleCheck} 
            disabled={!userInput.trim()}
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Check
          </button>
        ) : (
          <button 
            onClick={handleContinue}
            disabled={isContinueDisabled}
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default Flashcard;
