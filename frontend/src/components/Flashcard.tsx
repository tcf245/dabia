import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CornerDownLeft, Check, X, Volume2 } from 'lucide-react';
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
        console.log('[Flashcard] New card received:', card);
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
    
      const handleContinue = () => {
        console.log('[Flashcard] handleContinue called. Submitting answer.');
        const responseTime = Date.now() - startTime;
        const wasOriginallyCorrect = answerState === 'correct';
        onSubmit(card.card_id, wasOriginallyCorrect, responseTime);
      };
    
      const playAudioAndAdvance = async () => {
        console.log('[Flashcard] playAudioAndAdvance called.');
        if (isAudioPlaying) {
          console.log('[Flashcard] Audio is already playing, returning.');
          return;
        }
    
        console.log(`[Flashcard] Checking audio URL: ${card.audio_url}`);
        if (card.audio_url) {
          setIsAudioPlaying(true);
          const audio = new Audio(card.audio_url);
          audioRef.current = audio;
          audio.onended = handleContinue;
          try {
            console.log('[Flashcard] Attempting to play audio...');
            await audio.play();
            console.log('[Flashcard] audio.play() successful.');
          } catch (err) {
            console.error("[Flashcard] audio.play() failed:", err);
            handleContinue(); // If play fails, advance so user is not stuck
          }
        } else {
          console.log('[Flashcard] No audio URL found. Advancing after 500ms.');
          setTimeout(handleContinue, 500); // No audio, advance after delay
        }
      };
    
      const handleCheck = () => {
        console.log('[Flashcard] handleCheck called.');
        if (!userInput.trim()) return;
        const isCorrect = userInput.trim().toLowerCase() === card.target.word.toLowerCase();
        if (isCorrect) {
          console.log('[Flashcard] Answer is correct.');
          setAnswerState('correct');
          playAudioAndAdvance();
        } else {
          console.log('[Flashcard] Answer is incorrect.');
          setAnswerState('incorrect');
          setUserInput(''); // Clear input to force re-typing
        }
      };
    
      const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        console.log(`[Flashcard] handleKeyPress called with key: ${e.key}`);
        if (answerState === 'unanswered') {
          handleCheck();
        } else if (answerState === 'incorrect') {
          if (userInput.trim().toLowerCase() === card.target.word.toLowerCase()) {
            console.log('[Flashcard] Correct word re-typed. Playing audio.');
            playAudioAndAdvance();
          }
        }
      };
  const sentenceParts = card.sentence_template.split('__');

  const getBorderColor = () => {
    if (isAudioPlaying) return 'ring-primary';
    if (answerState === 'correct') return 'ring-success';
    if (answerState === 'incorrect') return 'ring-destructive';
    return 'ring-transparent';
  };

  const getInputColor = () => {
    if (answerState === 'correct') return 'text-success';
    if (answerState === 'incorrect') return 'text-foreground';
    return 'text-primary';
  }

  const ActionButton = () => (
    <button
      onClick={handleCheck}
      disabled={!userInput.trim()}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
    >
      Check
      <CornerDownLeft size={18} />
    </button>
  );

  return (
    <div className={`bg-card rounded-xl shadow-lg w-full max-w-2xl ring-2 ${getBorderColor()} transition-all duration-300`}>
      <div className="p-8 md:p-10 relative">
        <div className="flex items-center text-muted-foreground mb-8">
          <MessageCircle className="mr-3" size={20} />
          <span>{card.target.hint || card.reading}</span>
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
              disabled={answerState === 'correct' || isAudioPlaying}
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
                <span>Correct answer: {card.target.word} {card.reading && `(${card.reading})`}</span>
              </div>
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

        <div className="flex justify-end mt-8 min-h-[52px]">
          {answerState === 'unanswered' && <ActionButton />}
        </div>

        {isAudioPlaying && (
          <div className="absolute bottom-8 right-10 flex items-center gap-2 text-primary font-semibold">
            <Volume2 size={20} />
            <span>Playing...</span>
          </div>
        )}
      </div>

      {card.sentence_translation && (
        <div className="bg-muted/50 px-10 py-4 border-t border-border text-center text-muted-foreground rounded-b-xl">
          {card.sentence_translation}
        </div>
      )}
    </div>
  );
};

export default Flashcard;
