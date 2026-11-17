import { useState } from 'react';
import { useProgress } from './lib/progress';
import Home from './components/Home';
import LetterMap from './components/LetterMap';
import Learn from './components/Learn';
import Quiz from './components/Quiz';

export default function App() {
  const { progress, completeLetter, recordQuiz, reset } = useProgress();
  const [screen, setScreen] = useState({ name: 'home' });

  const home = () => setScreen({ name: 'home' });
  const map = (lang) => setScreen({ name: 'map', lang });
  const learn = (lang, index) => setScreen({ name: 'learn', lang, index });
  const quiz = (lang) => setScreen({ name: 'quiz', lang });

  switch (screen.name) {
    case 'map':
      return (
        <LetterMap
          langId={screen.lang}
          progress={progress}
          onBack={home}
          onLearn={(i) => learn(screen.lang, i)}
          onQuiz={() => quiz(screen.lang)}
        />
      );
    case 'learn':
      return (
        <Learn
          key={`${screen.lang}-${screen.index}`}
          langId={screen.lang}
          startIndex={screen.index}
          progress={progress}
          onComplete={completeLetter}
          onExit={() => map(screen.lang)}
          onQuiz={() => quiz(screen.lang)}
        />
      );
    case 'quiz':
      return (
        <Quiz
          langId={screen.lang}
          progress={progress}
          onFinish={recordQuiz}
          onExit={() => map(screen.lang)}
        />
      );
    default:
      return <Home progress={progress} onOpen={map} onQuiz={quiz} onReset={reset} />;
  }
}
