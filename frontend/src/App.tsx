import LearningSession from './pages/LearningSession';

function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <main className="max-w-4xl mx-auto p-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Dabia (ダビア) Learning</h1>
        </header>
        <LearningSession />
      </main>
    </div>
  );
}

export default App;