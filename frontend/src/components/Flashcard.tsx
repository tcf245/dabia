import React, { useState, useEffect, useRef } from 'react';
import type { Card as FlashcardDataType } from '../services/api';
import { FiStar, FiHelpCircle, FiPlayCircle, FiChevronRight } from 'react-icons/fi';

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string;
  reading: string | null;
  translation: string | null;
} | null;

interface FlashcardProps {
  card: FlashcardDataType;
  onCheck: (userInput: string) => void;
  onContinue: () => void;
  loading: boolean;
  feedback: Feedback;
  showReplayAudioButton: boolean; // New prop to control replay audio button visibility
  onReplayAudio: () => void; // New prop for replaying audio
}

const getFuriganaReading = (furigana: string, word: string): string | null => {
  if (!furigana) return null;
  const match = furigana.match(new RegExp(`${word}\\[([^\\]]+)\\]`));
  return match ? match[1] : null;
};

const Flashcard: React.FC<FlashcardProps> = ({ card, onCheck, onContinue, loading, feedback, showReplayAudioButton, onReplayAudio }) => {
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserInput('');
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [card, loading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      if (!feedback) {
        onCheck(userInput);
      } else {
        onContinue();
      }
    }
  };

  const sentenceParts = card.sentence_template.split('__');
  
  const borderColorClass = feedback && feedback.isCorrect ? 'border-green-500' : feedback && !feedback.isCorrect ? 'border-red-500' : 'border-gray-200';

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
            disabled={loading || (feedback && feedback.isCorrect)}
            className="bg-transparent border-b-2 focus:outline-none text-center text-3xl md:text-4xl w-40"
            style={{ borderColor: feedback && !feedback.isCorrect ? '#EF4444' : feedback && feedback.isCorrect ? '#22C55E' : '#9CA3AF' }}
            autoFocus
          />
        </div>
        {sentenceParts[1]}
      </div>

      {/* Always display translation */}
      <div className="text-center text-gray-500 font-normal mt-2 mb-4">
        {card.sentence_translation}
      </div>

      {/* Feedback Section */}
      <div className="text-center min-h-[6rem]">
        {feedback && !feedback.isCorrect && (
          <div className="text-red-500 mb-4">
            <div className="font-bold text-lg">Correct Answer:</div>
            <div className="text-2xl">{feedback.reading ? `${feedback.correctAnswer} [${feedback.reading}]` : feedback.correctAnswer}</div>
          </div>
        )}
        {feedback && feedback.isCorrect && (
          <p className="text-green-600 text-lg font-semibold">Correct!</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center mt-4">
        {showReplayAudioButton && (
          <button onClick={onReplayAudio} className="mr-4 p-3 rounded-full hover:bg-gray-100 transition-colors">
            <FiPlayCircle className="text-2xl text-sora-iro" />
          </button>
        )}
        {!feedback ? (
          <button 
            onClick={() => onCheck(userInput)} 
            disabled={!userInput.trim() || loading}
            className="px-8 py-3 rounded-lg font-semibold transition-colors bg-sora-iro text-white hover:bg-opacity-90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Check'}
          </button>
        ) : (
          <button 
            onClick={onContinue}
            className="px-8 py-3 rounded-lg font-semibold transition-colors bg-sora-iro text-white hover:bg-opacity-90 flex items-center"
          >
            Continue <FiChevronRight className="ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Flashcard;
