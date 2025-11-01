import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Container, Button } from '@mui/material';
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
      setError('Failed to fetch card. Please try again.');
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
      card_id: cardId,
      isCorrect,
      response_time_ms: responseTime,
    };
    fetchNextCard(previousAnswer);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading session...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography color="error">Error: {error}</Typography>
        <Button variant="contained" onClick={() => fetchNextCard()}>Retry</Button>
      </Container>
    );
  }

  if (!currentCard) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6">Session Completed or No Cards Available!</Typography>
        <SessionProgress progress={sessionProgress} />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <SessionProgress progress={sessionProgress} />
      <Flashcard card={currentCard} onSubmit={handleSubmitAnswer} />
    </Container>
  );
};

export default LearningSession;
