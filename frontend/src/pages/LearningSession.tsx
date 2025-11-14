import React, { useState, useEffect } from 'react';
import { LoaderCircle, AlertTriangle, PartyPopper } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import SessionProgress from '../components/SessionProgress';
import { getNextCard } from '../services/api';
import type { PreviousAnswer, Card, SessionProgress as SessionProgressType } from '../services/api';

const LearningSession: React.FC = () => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [sessionProgress, setSessionProgress] = useState<SessionProgressType>({ completed_today: 0, goal_today: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNextCard = async (previousAnswer?: PreviousAnswer) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNextCard(previousAnswer);
      setCurrentCard(response.card);
      setSessionProgress(response.session_progress);
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

  const handleSubmitAnswer = (cardId: string, isCorrect: boolean, responseTime: number) => {
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

  const MessageCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="bg-card rounded-lg shadow-md border w-full max-w-md p-8 text-center flex flex-col items-center">
      <div className="mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-card-foreground mb-2">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );

  if (loading && !currentCard) { // Only show initial loading screen
    return (
      <MessageCard
        icon={<LoaderCircle className="animate-spin text-primary" size={48} />}
        title="Loading Session..."
      >
        <p>Getting your first card ready!</p>
      </MessageCard>
    );
  }

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

  if (!currentCard) {
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
    <div className="w-full flex flex-col items-center">
      <SessionProgress progress={sessionProgress} />
      {loading ? (
        <div className="w-full max-w-2xl h-[450px] flex items-center justify-center">
            <LoaderCircle className="animate-spin text-primary" size={48} />
        </div>
      ) : (
        <Flashcard card={currentCard} onSubmit={handleSubmitAnswer} />
      )}
    </div>
  );
};

export default LearningSession;
