import React from 'react';
import LearningSession from './pages/LearningSession';
import { CssBaseline, AppBar, Toolbar, Typography, Container } from '@mui/material';

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Dabia (ダビア) Learning
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <LearningSession />
      </Container>
    </React.Fragment>
  );
}

export default App;