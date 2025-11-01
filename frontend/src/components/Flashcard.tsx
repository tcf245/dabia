import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, TextField, Button, Box } from '@mui/material';
import type { Card as FlashcardDataType } from '../services/api';

interface FlashcardProps {
  card: FlashcardDataType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [answerState, setAnswerState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [startTime, setStartTime] = useState(Date.now());

  // Reset state when a new card is passed in
  useEffect(() => {
    setUserInput('');
    setAnswerState('unanswered');
    setStartTime(Date.now());
  }, [card]);

  const handleCheck = () => {
    const isCorrect = userInput.trim().toLowerCase() === card.target.word.toLowerCase();
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
  };

  const handleContinue = () => {
    const responseTime = Date.now() - startTime;
    const isCorrect = answerState === 'correct';
    onSubmit(card.card_id, isCorrect, responseTime);
  };

  const sentenceParts = card.sentence_template.split('__');

  const getBorderColor = () => {
    if (answerState === 'correct') return 'success.main';
    if (answerState === 'incorrect') return 'error.main';
    return 'transparent';
  };

  return (
    <Card sx={{ minWidth: 300, maxWidth: 600, margin: '20px auto', border: 2, borderColor: getBorderColor() }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {sentenceParts[0]}
          <TextField
            variant="standard"
            size="small"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && answerState === 'unanswered') {
                handleCheck();
              }
            }}
            disabled={answerState !== 'unanswered'}
            sx={{ width: '100px', mx: 1, display: 'inline-block' }}
            autoFocus
          />
          {sentenceParts[1]}
        </Typography>
        
        {answerState === 'incorrect' && (
          <Typography variant="body1" color="error" sx={{ mt: 2 }}>
            Correct answer: <Typography component="span" fontWeight="bold">{card.target.word}</Typography>
          </Typography>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          {answerState === 'unanswered' ? (
            <Button variant="contained" onClick={handleCheck} disabled={!userInput.trim()}>
              Check
            </Button>
          ) : (
            <Button variant="contained" onClick={handleContinue}>
              Continue
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Flashcard;
