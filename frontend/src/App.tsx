import LearningSession from './pages/LearningSession';

function App() {
  return (
    <div className="flex flex-col items-center min-h-screen w-full p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-4xl mb-8">
        <h1 className="text-2xl font-bold text-foreground/80">Dabia</h1>
      </header>
      <main className="flex flex-col items-center justify-center w-full flex-grow">
        <LearningSession />
      </main>
    </div>
  );
}

export default App;