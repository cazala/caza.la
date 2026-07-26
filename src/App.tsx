import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import AutomataCanvas from './components/AutomataCanvas';
import Canvas from './components/Canvas';
import { useHueTextColor } from './hooks/useHueTextColor';
import './App.css';

type View = 'home' | 'work';
type WorkSection = 'open-source' | 'experience';

const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/';

const viewFromPath = (): View => {
  const path = currentPath();
  return path === '/work' || path.startsWith('/work/') ? 'work' : 'home';
};

const workSectionFromPath = (): WorkSection =>
  currentPath() === '/work/experience' ? 'experience' : 'open-source';

const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const openSourceProjects = [
  {
    name: 'party',
    href: 'https://caza.la/party',
    description: 'particle system and physics engine',
  },
  {
    name: 'automata',
    href: 'https://caza.la/automata',
    description: 'webgpu cellular automata',
  },
  {
    name: 'synaptic',
    href: 'https://github.com/cazala/synaptic',
    description: 'javascript neural network',
  },
  {
    name: 'coin-hive',
    href: 'https://github.com/cazala/coin-hive',
    description: 'node.js cryptocurrency miner',
  },
];

const experience = [
  {
    company: 'Decentraland',
    years: '2017–present',
    description:
      'built and led work on creator tools, marketplaces, governance apps, and the SDK ecosystem; now advising.',
  },
  {
    company: 'MuleSoft',
    years: '2014–2017',
    description:
      'led the distributed frontend team and took the visual editor for building system integrations and automations from prototype to production.',
  },
  {
    company: 'Soflex',
    years: '2011–2014',
    description:
      'built web-based mapping and vehicle-tracking systems for Buenos Aires emergency and police services.',
  },
  {
    company: 'Envato',
    years: '2008–2011',
    description:
      'created and sold Flash components to 5,000+ customers, becoming an exclusive and featured author.',
  },
];

function App() {
  const [view, setView] = useState<View>(viewFromPath);
  const [workSection, setWorkSection] = useState<WorkSection>(workSectionFromPath);
  const [isEnteringWork, setIsEnteringWork] = useState(false);
  const onWorkHueChange = useHueTextColor('.work-panel');

  useEffect(() => {
    const onPopState = () => {
      setIsEnteringWork(false);
      setView(viewFromPath());
      setWorkSection(workSectionFromPath());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title =
      view === 'home'
        ? 'Juan Cazala'
        : `${workSection === 'open-source' ? 'Open Source' : 'Experience'} — Juan Cazala`;
  }, [view, workSection]);

  const beginWorkTransition = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (isEnteringWork) return;
    setIsEnteringWork(true);
  };

  const finishWorkTransition = useCallback(() => {
    window.history.pushState({}, '', '/work');
    setView('work');
    setWorkSection('open-source');
    setIsEnteringWork(false);
  }, []);

  const showWorkSection = (event: MouseEvent<HTMLAnchorElement>, nextSection: WorkSection) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (nextSection === workSection) return;

    window.history.pushState({}, '', nextSection === 'experience' ? '/work/experience' : '/work');
    setWorkSection(nextSection);
  };

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
              <br />I like making things that move, grow, and behave.
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
          <AutomataCanvas onHueChange={onWorkHueChange} />
          <main className="content-panel work-panel">
            <nav className="work-switcher align-center full-width" aria-label="Work sections">
              <a
                aria-current={workSection === 'open-source' ? 'page' : undefined}
                className={workSection === 'open-source' ? 'is-active' : undefined}
                href="/work"
                onClick={event => showWorkSection(event, 'open-source')}
              >
                open source
              </a>
              <a
                aria-current={workSection === 'experience' ? 'page' : undefined}
                className={workSection === 'experience' ? 'is-active' : undefined}
                href="/work/experience"
                onClick={event => showWorkSection(event, 'experience')}
              >
                experience
              </a>
            </nav>

            <section className="work-section" key={workSection}>
              {workSection === 'open-source' ? (
                <ul className="work-list">
                  {openSourceProjects.map(project => (
                    <li key={project.name}>
                      <a
                        className="project-link"
                        href={project.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <b className="project-name">{project.name}</b>: {project.description}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="work-list">
                  {experience.map(item => (
                    <li key={item.company}>
                      <b className="work-heading">{item.company}</b> ({item.years}):{' '}
                      {item.description}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <nav className="work-footer" aria-label="Work page links">
              <a href="/" onClick={returnHome}>
                <span aria-hidden="true">←</span> home
              </a>
              <a
                className="work-social-link"
                href="https://github.com/cazala"
                target="_blank"
                rel="noopener noreferrer"
              >
                github
              </a>
              <a
                className="work-social-link"
                href="https://x.com/juancazala"
                target="_blank"
                rel="noopener noreferrer"
              >
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
