import React, { useState, useEffect, useRef } from 'react';
import Flashcard from '../components/Flashcard';
import SessionProgress from '../components/SessionProgress';
import { getNextCard } from '../services/api';
import type { PreviousAnswer, Card, SessionProgress as SessionProgressType } from '../services/api';

const LearningSession: React.FC = () => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressType>({ completed_today: 0, goal_today: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastAnswer = useRef<PreviousAnswer | null>(null);

  const fetchNextCard = async (previousAnswer?: PreviousAnswer) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNextCard(previousAnswer);
      setCurrentCard(response.card);
      setSessionProgress(response.session_progress);
    } catch (err) {
      setError('Failed to fetch card. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextCard(); // Fetch the first card when the component mounts
  }, []);

  const handleAudioEnded = () => {
    if (lastAnswer.current) {
      fetchNextCard(lastAnswer.current);
    }
  };

  const handleSubmitAnswer = (cardId: string, isCorrect: boolean, responseTime: number) => {
    const previousAnswer: PreviousAnswer = {
      cardId: cardId,
      isCorrect: isCorrect,
      responseTimeMs: responseTime,
    };
    lastAnswer.current = previousAnswer;

    if (isCorrect && currentCard?.sentence_audio_url && audioRef.current) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = currentCard.sentence_audio_url;
          audioRef.current.muted = false;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.error("Audio play failed:", e);
              // If audio fails, fetch next card immediately
              fetchNextCard(previousAnswer);
            });
          }
        }
      }, 500); // 500ms delay to show translation
    } else {
      fetchNextCard(previousAnswer);
    }
  };

  // Centering wrapper for loading/error/completion states
  const CenteredMessage: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="flex flex-col items-center justify-center h-full py-20">
      {children}
    </div>
  );

  if (loading && !currentCard) { // Only show initial loading message
    return (
      <CenteredMessage>
        <p className="text-lg text-gray-500">Loading session...</p>
      </CenteredMessage>
    );
  }

  if (error) {
    return (
      <CenteredMessage>
        <p className="text-lg text-red-500">Error: {error}</p>
        <button 
          onClick={() => fetchNextCard()}
          className="mt-6 px-6 py-2 bg-sora-iro text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
        >
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
      <Flashcard card={currentCard} onSubmit={handleSubmitAnswer} loading={loading} />
      <audio ref={audioRef} onEnded={handleAudioEnded} muted={false} />
    </div>
  );
};

export default LearningSession;
