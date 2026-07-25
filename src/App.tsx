import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import AutomataCanvas from './components/AutomataCanvas';
import Canvas from './components/Canvas';
import './App.css';

type View = 'home' | 'work';

const viewFromPath = (): View => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/work' ? 'work' : 'home';
};

const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

function App() {
  const [view, setView] = useState<View>(viewFromPath);
  const [isEnteringWork, setIsEnteringWork] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setIsEnteringWork(false);
      setView(viewFromPath());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = view === 'work' ? 'Work — Juan Cazala' : 'Juan Cazala';
  }, [view]);

  const beginWorkTransition = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (isEnteringWork) return;
    setIsEnteringWork(true);
  };

  const finishWorkTransition = useCallback(() => {
    window.history.pushState({}, '', '/work');
    setView('work');
    setIsEnteringWork(false);
  }, []);

  const returnHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    window.history.pushState({}, '', '/');
    setView('home');
  };

  return (
    <div className={`app view-${view}`} tabIndex={-1}>
      {view === 'home' ? (
        <>
          <Canvas
            transitionRequested={isEnteringWork}
            onTransitionComplete={finishWorkTransition}
          />
          <main className={`content-panel home-panel${isEnteringWork ? ' is-entering' : ''}`}>
            <p>
              <b className="hello">Hello World.</b>
              <br />
              <br />
              My name is Juan Cazala.
              <br />
              <br />
              I&apos;m a Software Engineer from Argentina.
              <br />
              <br />I make tools for things that move, grow, and behave.
            </p>
            <a className="work-link" href="/work" onClick={beginWorkTransition}>
              see what I&apos;ve been building <span aria-hidden="true">→</span>
            </a>
            <nav className="social-links" aria-label="Social links">
              <a href="https://github.com/cazala" target="_blank" rel="noopener noreferrer">
                github
              </a>
              <a href="https://x.com/juancazala" target="_blank" rel="noopener noreferrer">
                x
              </a>
            </nav>
          </main>
        </>
      ) : (
        <>
          <AutomataCanvas />
          <main className="content-panel work-panel">
            <header className="work-header">
              <p className="eyebrow">Selected open source</p>
              <h1>Things I&apos;ve been building lately.</h1>
            </header>

            <div className="project-list">
              <a className="project-link" href="/party">
                <span className="project-title">
                  party <span aria-hidden="true">↗</span>
                </span>
                <span className="project-description">
                  A WebGPU particle system and physics engine.
                </span>
              </a>
              <a className="project-link" href="/automata">
                <span className="project-title">
                  automata <span aria-hidden="true">↗</span>
                </span>
                <span className="project-description">A WebGPU cellular automata library.</span>
              </a>
            </div>

            <nav className="work-footer" aria-label="Work page links">
              <a href="/" onClick={returnHome}>
                <span aria-hidden="true">←</span> home
              </a>
              <a href="https://github.com/cazala" target="_blank" rel="noopener noreferrer">
                github
              </a>
              <a href="https://x.com/juancazala" target="_blank" rel="noopener noreferrer">
                x
              </a>
            </nav>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
