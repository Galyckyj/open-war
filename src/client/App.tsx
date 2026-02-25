import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainMenu } from './pages/MainMenu';
import { GamePage } from './pages/GamePage';

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game/:roomId" element={<GamePage />} />
      </Routes>
    </ErrorBoundary>
  );
}
