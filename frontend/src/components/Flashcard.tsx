import React, { useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Box } from '@mui/material';
import { Card as CardType } from '../services/api';

interface FlashcardProps {
  card: CardType;
  onSubmit: (cardId: string, isCorrect: boolean, responseTime: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSubmit }) => {
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const handleSubmit = () => {
    const responseTime = Date.now() - startTime;
    const isCorrect = userInput.trim() === card.target.word;
    onSubmit(card.card_id, isCorrect, responseTime);
    setUserInput('');
    setShowHint(false);
    setStartTime(Date.now()); // Reset timer for next card
  };

  const sentenceParts = card.sentence_template.split('__');

  return (
    <Card sx={{ minWidth: 300, maxWidth: 500, margin: '20px auto' }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          {sentenceParts[0]}
          <TextField
            variant="outlined"
            size="small"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            sx={{ width: '100px', margin: '0 5px' }}
          />
          {sentenceParts[1]}
        </Typography>
        {showHint && card.target.hint && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Hint: {card.target.hint}
          </Typography>
        )}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={() => setShowHint(!showHint)}>
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!userInput.trim()}>
            Submit
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Flashcard;
