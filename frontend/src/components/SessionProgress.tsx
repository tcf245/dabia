import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { SessionProgress as SessionProgressType } from '../services/api';

interface SessionProgressProps {
  progress: SessionProgressType;
}

const SessionProgress: React.FC<SessionProgressProps> = ({ progress }) => {
  const percentage = (progress.completed_today / progress.goal_today) * 100;

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="body2" color="text.secondary">{`Completed: ${progress.completed_today} / ${progress.goal_today}`}</Typography>
      <LinearProgress variant="determinate" value={percentage} sx={{ height: 10, borderRadius: 5 }} />
    </Box>
  );
};

export default SessionProgress;
