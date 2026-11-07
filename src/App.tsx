import { useEffect, useState } from 'react';
import type { View } from './nav';
import AllPage from './pages/AllPage';
import DetailPage from './pages/DetailPage';
import FormPage from './pages/FormPage';
import HomePage from './pages/HomePage';

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="app">
      {view.name === 'home' && <HomePage go={setView} />}
      {view.name === 'all' && <AllPage go={setView} />}
      {view.name === 'detail' && <DetailPage id={view.id} from={view.from} go={setView} />}
      {view.name === 'form' && <FormPage id={view.id} from={view.from} go={setView} />}
    </div>
  );
}
