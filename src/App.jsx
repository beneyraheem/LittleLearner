import { useState } from 'react';
import { useStore } from './lib/progress';
import { penScale } from './data/penSizes';
import Home from './components/Home';
import LetterMap from './components/LetterMap';
import Learn from './components/Learn';
import Quiz from './components/Quiz';
import ProfileForm from './components/ProfileForm';
import WhoIsPlaying from './components/WhoIsPlaying';
import ParentGate from './components/ParentGate';
import ParentMenu from './components/ParentMenu';

export default function App() {
  const store = useStore();
  const { profiles, profile, progress } = store;
  // With several children, ask who is playing each time the app opens.
  const [screen, setScreen] = useState(() => ({ name: profiles.length > 1 ? 'who' : 'home' }));
  const [gate, setGate] = useState(false);

  const home = () => setScreen({ name: 'home' });
  const map = (lang) => setScreen({ name: 'map', lang });
  const learn = (lang, index) => setScreen({ name: 'learn', lang, index });
  const quiz = (lang) => setScreen({ name: 'quiz', lang });
  const parent = () => setScreen({ name: 'parent' });
  const askParent = () => setGate(true);

  const gateOverlay = gate && (
    <ParentGate
      onPass={() => {
        setGate(false);
        parent();
      }}
      onCancel={() => setGate(false)}
    />
  );

  // First visit: make a profile for the child.
  if (!profiles.length) {
    return (
      <ProfileForm
        title="Welcome! 👋"
        subtitle="Let's make a profile for your child."
        submitLabel="Let's play! →"
        onSave={(data) => {
          store.addProfile(data);
          home();
        }}
      />
    );
  }

  let view;
  switch (screen.name) {
    case 'who':
      view = (
        <WhoIsPlaying
          profiles={profiles}
          progressOf={store.progressOf}
          activeId={profile?.id}
          onPick={(id) => {
            store.setActive(id);
            home();
          }}
          onParent={askParent}
        />
      );
      break;
    case 'parent':
      view = (
        <ParentMenu
          profiles={profiles}
          progressOf={store.progressOf}
          onBack={() => setScreen({ name: profiles.length > 1 ? 'who' : 'home' })}
          onAdd={() => setScreen({ name: 'profile', back: 'parent' })}
          onEdit={(id) => setScreen({ name: 'profile', id, back: 'parent' })}
          onReset={store.resetProfile}
          onPen={(id, pen) => store.updateProfile(id, { pen })}
          onDelete={store.deleteProfile}
        />
      );
      break;
    case 'profile': {
      const editing = profiles.find((p) => p.id === screen.id);
      view = (
        <ProfileForm
          key={screen.id || 'new'}
          initial={editing}
          title={editing ? `Edit ${editing.name}` : 'Add a child'}
          submitLabel={editing ? 'Save' : 'Add child'}
          onCancel={() => setScreen({ name: screen.back })}
          onSave={(data) => {
            if (editing) store.updateProfile(editing.id, data);
            else store.addProfile(data);
            setScreen({ name: screen.back });
          }}
        />
      );
      break;
    }
    case 'map':
      view = (
        <LetterMap
          langId={screen.lang}
          progress={progress}
          onBack={home}
          onLearn={(i) => learn(screen.lang, i)}
          onQuiz={() => quiz(screen.lang)}
        />
      );
      break;
    case 'learn':
      view = (
        <Learn
          key={`${profile.id}-${screen.lang}-${screen.index}`}
          langId={screen.lang}
          startIndex={screen.index}
          progress={progress}
          onComplete={store.completeLetter}
          onExit={() => map(screen.lang)}
          onQuiz={() => quiz(screen.lang)}
          penScale={penScale(profile.pen)}
        />
      );
      break;
    case 'quiz':
      view = (
        <Quiz
          key={profile.id}
          langId={screen.lang}
          progress={progress}
          onFinish={store.recordQuiz}
          onExit={() => map(screen.lang)}
        />
      );
      break;
    default:
      view = (
        <Home
          profile={profile}
          progress={progress}
          onOpen={map}
          onQuiz={quiz}
          onSwitch={() => setScreen({ name: 'who' })}
          onParent={askParent}
        />
      );
  }

  return (
    <>
      {view}
      {gateOverlay}
    </>
  );
}
