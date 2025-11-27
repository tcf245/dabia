import React, { useState, useEffect } from 'react';
import { AlertTriangle, PartyPopper } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import SkeletonFlashcard from '../components/SkeletonFlashcard';
import SessionProgress from '../components/SessionProgress';
import { getNextCard, getCard } from '../services/api';
import type { PreviousAnswer, Card, SessionProgress as SessionProgressType } from '../services/api';
import { ArrowLeft } from 'lucide-react';

const LearningSession: React.FC = () => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressType>({ completed_today: 0, goal_today: 50 });
  const [previousCardId, setPreviousCardId] = useState<string | null>(null);
  const [isViewingPrevious, setIsViewingPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNextCard = async (previousAnswer?: PreviousAnswer) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNextCard(previousAnswer);
      setCurrentCard(response.card);
      setSessionProgress(response.session_progress);
      setPreviousCardId(response.previous_card_id);
      setIsViewingPrevious(false);
    } catch (err) {
      // A real app should have better error handling (e.g., check for 401, 500)
      // For now, we assume a network or CORS issue.
      setError('Could not connect to the server. Please check your connection or try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextCard(); // Fetch the first card when the component mounts
  }, []);

  // Handle global keyboard shortcuts for session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (!loading && !isViewingPrevious && previousCardId) {
          handlePreviousClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, isViewingPrevious, previousCardId]);

  const handleSubmitAnswer = (cardId: string, isCorrect: boolean, responseTime: number) => {
    if (isViewingPrevious) {
      // If viewing previous, just go back to current (or fetch next if we don't have a current buffered)
      // Actually, if we are viewing previous, we probably want to return to the *next* card we were supposed to do.
      // But for simplicity, let's just fetch next card as if we skipped.
      // OR, better: Disable answering on previous card.
      return;
    }

    const previousAnswer: PreviousAnswer = {
      cardId: cardId,
      isCorrect: isCorrect,
      responseTimeMs: responseTime,
    };
    if (isCorrect) {
      setSessionProgress(prev => ({ ...prev, completed_today: prev.completed_today + 1 }));
    }
    fetchNextCard(previousAnswer);
  };

  const handlePreviousClick = async () => {
    if (!previousCardId) return;

    setLoading(true);
    try {
      const card = await getCard(previousCardId);
      setCurrentCard(card);
      setIsViewingPrevious(true);
    } catch (err) {
      console.error("Failed to fetch previous card", err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setIsViewingPrevious(false);
    fetchNextCard();
  };

  const MessageCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="bg-card rounded-lg shadow-md border w-full max-w-md p-8 text-center flex flex-col items-center">
      <div className="mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-card-foreground mb-2">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );



  if (error) {
    return (
      <MessageCard
        icon={<AlertTriangle className="text-destructive" size={48} />}
        title="Connection Error"
      >
        <p className="mb-6">{error}</p>
        <button
          onClick={() => fetchNextCard()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </MessageCard>
    );
  }

  if (!loading && !currentCard) {
    return (
      <>
        <SessionProgress progress={sessionProgress} />
        <MessageCard
          icon={<PartyPopper className="text-primary" size={48} />}
          title="Session Completed!"
        >
          <p>You've finished all your reviews for now. Great job!</p>
        </MessageCard>
      </>
    );
  }

  return (
    <div className="w-full flex flex-col items-center relative">
      <SessionProgress progress={sessionProgress} />

      {/* Previous Button */}
      {!loading && !isViewingPrevious && previousCardId && (
        <button
          onClick={handlePreviousClick}
          className="absolute left-4 top-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Previous Card"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {loading ? (
        <div className="w-full flex justify-center">
          <SkeletonFlashcard />
        </div>
      ) : (
        <Flashcard
          card={currentCard!}
          onSubmit={handleSubmitAnswer}
          mode={isViewingPrevious ? 'review' : 'quiz'}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
};

export default LearningSession;
