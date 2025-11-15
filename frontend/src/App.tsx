import LearningSession from './pages/LearningSession';

function App() {
  return (
    <div className="bg-background min-h-screen w-full flex justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dabia</h1>
        </header>
        <main className="flex flex-col items-center justify-center w-full">
          <LearningSession />
        </main>
      </div>
    </div>
  );
}

export default App;