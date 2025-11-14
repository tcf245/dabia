import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, Check, X, Volume2 } from 'lucide-react';
import type { Card as FlashcardDataType } from '../services/api';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset state for new card
  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setStartTime(Date.now());
    setIsAudioPlaying(false);
    inputRef.current?.focus();
    
    // Stop any previous audio
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
    if (isAudioPlaying) return;

    if (card.sentence_audio_url) {
      setIsAudioPlaying(true);
      const audio = new Audio(card.sentence_audio_url);
      audioRef.current = audio;
      audio.onended = () => handleContinue(isCorrect);
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio play failed:", err);
        handleContinue(isCorrect);
      }
    } else {
      setTimeout(() => handleContinue(isCorrect), 500);
    }
  };

  const handleCheck = () => {
    const trimmedInput = userInput.trim();
    
    if (!trimmedInput) {
      setAnswerState('incorrect');
      setUserInput('');
      return;
    }
    
    const isCorrect = trimmedInput.toLowerCase() === card.target.word.toLowerCase();

    if (isCorrect) {
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
      setUserInput('');
    }
  };

  // Effect to handle side-effects of answer state changes
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
      if (userInput.trim().toLowerCase() === card.target.word.toLowerCase()) {
        // A corrected answer was originally incorrect
        playAudioAndAdvance(false);
      }
    }
  };

  const sentenceParts = card.sentence_template.split('__');

  const Feedback = () => {
    if (answerState === 'unanswered') {
      return (
        <div className="flex items-center text-muted-foreground">
          <span>{card.target.hint || card.reading}</span>
        </div>
      );
    }
    if (answerState === 'incorrect') {
      return (
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <X size={20} /> 
          <span>Correct answer: {card.target.word} {card.reading && `(${card.reading})`}</span>
        </div>
      );
    }
    if (answerState === 'correct') {
      return (
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Check size={20} />
          <span>Correct!</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-2xl flex flex-col h-[450px]">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <div className="text-4xl md:text-5xl text-foreground leading-relaxed flex items-center flex-wrap justify-center">
          {sentenceParts[0]}
          <div className="inline-block mx-2 relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={answerState === 'correct' || isAudioPlaying}
              className="bg-transparent focus:outline-none text-center text-4xl md:text-5xl w-64 text-primary font-semibold"
              autoFocus
              style={{ caretColor: 'var(--primary)' }}
            />
          </div>
          {sentenceParts[1]}
        </div>
        <div className={`w-[270px] h-1 mt-2 rounded-full bg-primary/20 transition-colors duration-300 ${answerState !== 'unanswered' ? 'bg-transparent' : ''}`}></div>
      </div>

      <div className="h-24 flex flex-col items-center justify-start pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={answerState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Feedback />
          </motion.div>
        </AnimatePresence>
        {answerState === 'unanswered' && (
          <div className="flex items-center text-muted-foreground mt-4">
            <span className="mr-2">Press Enter</span>
            <CornerDownLeft size={16} />
          </div>
        )}
        {isAudioPlaying && (
          <div className="flex items-center gap-2 text-primary font-semibold mt-4">
            <Volume2 size={20} />
            <span>Playing...</span>
          </div>
        )}
      </div>

      {card.sentence_translation && (
        <div className="border-t border-border text-center text-muted-foreground py-4">
          {card.sentence_translation}
        </div>
      )}
    </div>
  );
};

export default Flashcard;

