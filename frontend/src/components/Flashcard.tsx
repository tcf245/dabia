import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody, CardFooter, Input, Button } from "@heroui/react";
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
  onContinue: (isCorrectOnContinue: boolean) => void;
  loading: boolean;
  feedback: Feedback;
  showReplayAudioButton: boolean;
  onReplayAudio: () => void;
}

const getFuriganaReading = (furigana: string, word: string): string | null => {
  if (!furigana) return null;
  const match = furigana.match(new RegExp(`${word}\\[([^\\]]+)\\]`));
  return match ? match[1] : null;
};

const Flashcard: React.FC<FlashcardProps> = ({ card, onCheck, onContinue, loading, feedback, showReplayAudioButton, onReplayAudio }) => {
  if (!card) {
    return null;
  }

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
        onContinue(userInput.trim() === card.target.word);
      }
    }
  };

  const sentenceParts = card.sentence_template.split('__');
  
  const color = feedback && feedback.isCorrect ? 'success' : feedback && !feedback.isCorrect ? 'danger' : 'default';

  return (
    <Card className="w-full p-4">
      <CardHeader className="flex justify-between items-center">
        <div className="flex items-center text-gray-500">
          <FiHelpCircle className="mr-2" />
          <span>{card.target.hint}</span>
        </div>
        <div className="flex items-center text-gray-500" title={`Proficiency Level: ${card.proficiency_level}`}>
          <FiStar className="mr-2 text-yellow-500" />
          <span>{card.proficiency_level}</span>
        </div>
      </CardHeader>
      <CardBody className="text-center">
        <div className="text-center text-gray-500 font-normal mt-2 mb-4">
          {card.sentence_translation}
        </div>
        <div className="text-3xl md:text-4xl text-gray-800 my-4 leading-relaxed flex items-center justify-center flex-wrap text-center">
          {sentenceParts[0]}
          <Input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || (feedback && feedback.isCorrect)}
            className="w-40 mx-2 text-center text-3xl md:text-4xl"
            color={color}
            autoFocus
          />
          {sentenceParts[1]}
        </div>
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
      </CardBody>
      <CardFooter className="flex justify-end items-center">
        {showReplayAudioButton && (
          <Button isIconOnly onClick={onReplayAudio} variant="light" className="mr-2">
            <FiPlayCircle className="text-2xl text-sora-iro" />
          </Button>
        )}
        {!feedback ? (
          <Button 
            onClick={() => onCheck(userInput)} 
            disabled={!userInput.trim() || loading}
            color="primary"
          >
            {loading ? 'Loading...' : 'Check'}
          </Button>
        ) : (
          <Button 
            onClick={() => onContinue(userInput.trim() === card.target.word)}
            color="primary"
            endContent={<FiChevronRight />}
          >
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default Flashcard;
