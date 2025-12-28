import React, { useState, useEffect } from 'react';
import { AlertTriangle, PartyPopper } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import SkeletonFlashcard from '../components/SkeletonFlashcard';
import SessionProgress from '../components/SessionProgress';
import DailyGoalPopup from '../components/DailyGoalPopup';
import { getNextCard } from '../services/api';
import type { PreviousAnswer, Card, SessionProgress as SessionProgressType } from '../services/api';
import { ArrowLeft } from 'lucide-react';

const LearningSession: React.FC = () => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressType>({ completed_today: 0, goal_today: 50 });
  const [history, setHistory] = useState<Card[]>([]);
  const [future, setFuture] = useState<Card[]>([]);
  const [isViewingPrevious, setIsViewingPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDailyGoalPopupOpen, setIsDailyGoalPopupOpen] = useState(false);
  const hasShownDailyGoal = React.useRef(false);

  const fetchNextCard = async (previousAnswer?: PreviousAnswer) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNextCard(previousAnswer);
      setCurrentCard(response.card);
      setSessionProgress(response.session_progress);
      setIsViewingPrevious(false);
      setFuture([]); // Clear future stack when a new card is fetched

      // Check for daily goal completion
      if (
        response.session_progress.completed_today >= response.session_progress.goal_today &&
        !hasShownDailyGoal.current
      ) {
        setIsDailyGoalPopupOpen(true);
        hasShownDailyGoal.current = true;
      }
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
        if (!loading && history.length > 0) {
          handlePreviousClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, history]);

  const handleSubmitAnswer = (cardId: string, isCorrect: boolean, responseTime: number) => {
    if (isViewingPrevious) {
      // If viewing previous, just go back to current (or fetch next if we don't have a current buffered)
      // Actually, if we are viewing previous, we probably want to return to the *next* card we were supposed to do.
      // But for simplicity, let's just fetch next card as if we skipped.
      // OR, better: Disable answering on previous card.
      return;
    }

    if (currentCard) {
      setHistory(prev => [...prev, currentCard]);
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

  const handlePreviousClick = () => {
    if (history.length === 0) return;

    const newHistory = [...history];
    const prevCard = newHistory.pop()!;

    if (currentCard) {
      setFuture(prev => [currentCard, ...prev]);
    }

    setHistory(newHistory);
    setCurrentCard(prevCard);
    setIsViewingPrevious(true);
  };

  const handleContinue = () => {
    if (future.length > 0) {
      const newFuture = [...future];
      const nextCard = newFuture.shift()!;

      if (currentCard) {
        setHistory(prev => [...prev, currentCard]);
      }

      setFuture(newFuture);
      setCurrentCard(nextCard);

      // If no more future cards, we are back to the "head" (quiz mode)
      if (newFuture.length === 0) {
        setIsViewingPrevious(false);
      }
    } else {
      setIsViewingPrevious(false);
      fetchNextCard();
    }
  };

  const MessageCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-[#E6E6E3] shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full max-w-md p-8 text-center flex flex-col items-center">
      <div className="mb-4">{icon}</div>
      <h2 className="font-serif text-2xl font-normal text-[#2A2A29] mb-2">{title}</h2>
      <div className="text-[#74746E] font-light">{children}</div>
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
      <div className="w-full max-w-2xl px-5">
        <SessionProgress
          progress={sessionProgress}
          headerLeft={
            !loading && history.length > 0 ? (
              <button
                onClick={handlePreviousClick}
                className="text-muted-foreground hover:text-foreground transition-colors p-0 flex items-center"
                title="Previous Card"
              >
                <ArrowLeft size={24} />
              </button>
            ) : null
          }
        />
      </div>

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

      <DailyGoalPopup
        isOpen={isDailyGoalPopupOpen}
        onClose={() => setIsDailyGoalPopupOpen(false)}
      />
    </div>
  );
};

export default LearningSession;
