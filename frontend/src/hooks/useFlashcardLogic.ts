import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card as FlashcardDataType } from '../services/api';
import { validateAnswer } from '../utils/validation';
import { calculateNextProficiency } from '../utils/srs';

export type AnswerState = 'unanswered' | 'correct' | 'incorrect';

type FlashcardModeProps =
  | { mode?: 'quiz'; onContinue?: never }
  | { mode: 'review'; onContinue: () => void };

type BaseProps = {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
};

export type UseFlashcardLogicProps = BaseProps & FlashcardModeProps;

export const useFlashcardLogic = (props: UseFlashcardLogicProps) => {
  const { card, mode = 'quiz', onSubmit } = props;
  const onContinue = (props as any).onContinue;

  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [displayedProficiency, setDisplayedProficiency] = useState(card.proficiency_level || 1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when card changes
  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setDisplayedProficiency(card.proficiency_level || 1);
    setStartTime(Date.now());
    // Auto-focus input
    inputRef.current?.focus();

    // Cleanup audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [card]);

  const handleSubmission = useCallback((isCorrect: boolean) => {
    const responseTime = Date.now() - startTime;
    onSubmit(card.card_id, isCorrect, responseTime);
  }, [card.card_id, startTime, onSubmit]);

  const playAudioAndAdvance = useCallback(async (isCorrect: boolean) => {
    if (card.sentence_audio_url) {
      // Stop previous audio if any
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(card.sentence_audio_url);
      audioRef.current = audio;
      audio.onended = () => handleSubmission(isCorrect);
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio play failed:", err);
        handleSubmission(isCorrect);
      }
    } else {
      setTimeout(() => handleSubmission(isCorrect), 800);
    }
  }, [card.sentence_audio_url, handleSubmission]);

  const playSentenceAudio = useCallback(() => {
    if (card.sentence_audio_url) {
      // Stop overlapping audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(card.sentence_audio_url);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
      };

      audio.play().catch(err => {
        console.error("Manual audio play failed:", err);
        setIsPlayingAudio(false);
      });
    }
  }, [card.sentence_audio_url]);

  const handleCheck = useCallback(() => {
    // Removed !userInput.trim() check to allow empty submission (treated as incorrect)
    const isCorrect = validateAnswer(userInput, card.target.word, card.reading);
    if (isCorrect) {
      setAnswerState('correct');
      setDisplayedProficiency(calculateNextProficiency(card.proficiency_level || 1, true));
      playAudioAndAdvance(true);
    } else {
      setAnswerState('incorrect');
      setDisplayedProficiency(calculateNextProficiency(card.proficiency_level || 1, false));
      setUserInput(''); // Clear input on retry
    }
  }, [userInput, card.target.word, card.reading, card.proficiency_level, playAudioAndAdvance]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (answerState === 'unanswered') {
      handleCheck();
    } else if (answerState === 'incorrect') {
      // Allow retry or correction
      if (validateAnswer(userInput, card.target.word, card.reading)) {
        setAnswerState('correct');
        // If it was already incorrect, we don't update proficiency further here
        // as handleCheck already processed the "incorrect" result for SRS.
        playAudioAndAdvance(false);
      } else {
        setUserInput('');
      }
    }
  }, [answerState, handleCheck, userInput, card.target.word, card.reading, playAudioAndAdvance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (mode === 'review' && onContinue) {
          onContinue();
        } else if (mode === 'quiz' && answerState === 'unanswered') {
          // Removed userInput.trim() check here too
          handleCheck();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onContinue, answerState, userInput, handleCheck]);

  const canPlayAudio = mode === 'review' || answerState !== 'unanswered';

  return {
    userInput,
    setUserInput,
    answerState,
    inputRef,
    handleCheck,
    handleKeyPress,
    playSentenceAudio,
    isPlayingAudio,
    canPlayAudio,
    displayedProficiency
  };
};
