import React, { useState, useEffect, useRef } from 'react';
import type { Card as FlashcardDataType } from '../services/api';
import { FiStar, FiHelpCircle } from 'react-icons/fi';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
  loading: boolean;
}

// Helper to parse furigana
const getFuriganaReading = (furigana: string, word: string): string | null => {
  if (!furigana) return null;
  const match = furigana.match(new RegExp(`${word}\\[([^\\]]+)\\]`));
  return match ? match[1] : null;
};

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit, loading }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setStartTime(Date.now());
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [card, loading]);

  const handleCheck = () => {
    if (!userInput.trim() || loading) return;
    const isCorrect = userInput.trim() === card.target.word;
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      const responseTime = Date.now() - startTime;
      onSubmit(card.card_id, true, responseTime);
    }
  };

  const handleContinue = () => {
    const responseTime = Date.now() - startTime;
    onSubmit(card.card_id, false, responseTime);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || loading) return;
    if (answerState === 'unanswered') {
      handleCheck();
    } else if (answerState === 'incorrect') {
      if (userInput.trim() === card.target.word) {
        handleContinue();
      }
    }
  };

  const sentenceParts = card.sentence_template.split('__');
  const reading = getFuriganaReading(card.sentence_furigana || '', card.target.word);

  const borderColorClass = answerState === 'correct' ? 'border-green-500' : answerState === 'incorrect' ? 'border-red-500' : 'border-gray-200';

  return (
    <div className={`bg-white rounded-xl shadow-lg p-8 md:p-12 w-full transition-all duration-300 ${borderColorClass} border-2`}>
      {/* Header with Proficiency */}
      <div className="flex justify-between items-center text-gray-400 mb-8">
        <div className="flex items-center">
          <FiHelpCircle className="mr-2" />
          <span>{card.target.hint}</span>
        </div>
        <div className="flex items-center" title={`Proficiency Level: ${card.proficiency_level}`}>
          <FiStar className="mr-2 text-yellow-500" />
          <span>{card.proficiency_level}</span>
        </div>
      </div>

      {/* Sentence with input */}
      <div className="text-3xl md:text-4xl text-gray-800 mb-10 leading-relaxed flex items-center justify-center flex-wrap text-center">
        {sentenceParts[0]}
        <div className="inline-block mx-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={answerState === 'correct' || loading}
            className="bg-transparent border-b-2 focus:outline-none text-center text-3xl md:text-4xl w-40"
            style={{ borderColor: answerState === 'incorrect' ? '#EF4444' : answerState === 'correct' ? '#22C55E' : '#9CA3AF' }}
            autoFocus
          />
        </div>
        {sentenceParts[1]}
      </div>

      {/* Feedback Section */}
      <div className="text-center min-h-[6rem]">
        {answerState === 'incorrect' && (
          <div className="text-red-500 mb-4">
            <div className="font-bold text-lg">Correct Answer:</div>
            <div className="text-2xl">{reading ? `${card.target.word} [${reading}]` : card.target.word}</div>
            <div className="text-sm mt-2">Type the correct answer to continue.</div>
          </div>
        )}
        {answerState === 'correct' && (
          <div className="text-green-600 text-lg font-semibold">
            <p>Correct!</p>
            <p className="text-gray-500 font-normal mt-2">{card.sentence_translation}</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex justify-end mt-4">
        {answerState === 'unanswered' ? (
          <button 
            onClick={handleCheck} 
            disabled={!userInput.trim() || loading}
            className="px-8 py-3 rounded-lg font-semibold transition-colors bg-sora-iro text-white hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Check'}
          </button>
        ) : (
          <button 
            onClick={handleContinue}
            disabled={answerState === 'incorrect' && userInput.trim() !== card.target.word}
            className="px-8 py-3 rounded-lg font-semibold transition-colors bg-sora-iro text-white hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default Flashcard;
