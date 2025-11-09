import React, { useState, useEffect, useRef } from 'react';
import Flashcard from '../components/Flashcard';
import SessionProgress from '../components/SessionProgress';
import { getNextCard } from '../services/api';
import type { PreviousAnswer, Card, SessionProgress as SessionProgressType } from '../services/api';

type SessionState = 'loading' | 'answering' | 'feedback';

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string;
  reading: string | null;
  translation: string | null;
} | null;

// Helper to parse furigana
const getFuriganaReading = (furigana: string, word: string): string | null => {
  if (!furigana) return null;
  const match = furigana.match(new RegExp(`${word}\\[([^\\]]+)\\]`));
  return match ? match[1] : null;
};

const LearningSession: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressType>({ completed_today: 0, goal_today: 50 });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showReplayAudioButton, setShowReplayAudioButton] = useState(false); // New state for replay button
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastAnswer = useRef<PreviousAnswer | null>(null);
  const startTime = useRef<number>(Date.now());

  const fetchNextCard = async (previousAnswer?: PreviousAnswer) => {
    setSessionState('loading');
    setFeedback(null);
    setShowReplayAudioButton(false); // Reset replay button visibility
    try {
      const response = await getNextCard(previousAnswer);
      if (response.card) {
        setCurrentCard(response.card);
        setSessionProgress(response.session_progress);
        setSessionState('answering');
        startTime.current = Date.now();
      } else {
        setCurrentCard(null);
        setSessionState('answering');
      }
    } catch (err) {
      setError('Failed to fetch card. Please try again.');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNextCard();
  }, []);

  const handlePlayAudio = () => {
    if (currentCard?.sentence_audio_url && audioRef.current) {
      audioRef.current.src = currentCard.sentence_audio_url;
      audioRef.current.play().catch(e => {
        console.error("Audio play failed:", e);
        setShowReplayAudioButton(true); // Show replay button if auto-play fails
      });
    }
  };

  const handleCheckAnswer = (userInput: string) => {
    if (!currentCard) return;

    const isCorrect = userInput.trim() === currentCard.target.word;
    const responseTime = Date.now() - startTime.current;

    lastAnswer.current = {
      cardId: currentCard.card_id,
      isCorrect: isCorrect,
      responseTimeMs: responseTime,
    };

    setFeedback({
      isCorrect,
      correctAnswer: currentCard.target.word,
      reading: getFuriganaReading(currentCard.sentence_furigana || '', currentCard.target.word),
      translation: currentCard.sentence_translation,
    });
    setSessionState('feedback');

    if (isCorrect) {
      handlePlayAudio(); // Attempt to auto-play audio
    }
  };

  const handleContinue = (isCorrectOnContinue: boolean) => { // Modified signature
    if (isCorrectOnContinue) {
      handlePlayAudio(); // Play audio if correct on continue
    }
    if (lastAnswer.current) {
      fetchNextCard(lastAnswer.current);
    }
  };

  const CenteredMessage: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="flex flex-col items-center justify-center h-full py-20">
      {children}
    </div>
  );

  if (sessionState === 'loading' && !currentCard) {
    return <CenteredMessage><p className="text-lg text-gray-500">Loading session...</p></CenteredMessage>;
  }

  if (error) {
    return (
      <CenteredMessage>
        <p className="text-lg text-red-500">Error: {error}</p>
        <button onClick={() => fetchNextCard(lastAnswer.current || undefined)} className="mt-6 px-6 py-2 bg-sora-iro text-white rounded-lg font-semibold hover:bg-opacity-90">
          Retry
        </button>
      </CenteredMessage>
    );
  }

  if (!currentCard) {
    return (
      <CenteredMessage>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Session Completed!</h2>
        <p className="text-lg text-gray-600">You have completed all available cards for now.</p>
        <SessionProgress progress={sessionProgress} />
      </CenteredMessage>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <SessionProgress progress={sessionProgress} />
      <Flashcard 
        card={currentCard} 
        onCheck={handleCheckAnswer} 
        onContinue={handleContinue}
        onReplayAudio={handlePlayAudio} // Pass handlePlayAudio as onReplayAudio
        loading={sessionState === 'loading'} 
        feedback={feedback}
        showReplayAudioButton={showReplayAudioButton}
      />
      <audio ref={audioRef} />
    </div>
  );
};

export default LearningSession;
