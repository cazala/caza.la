import { useState, useEffect } from 'react';
import FishCanvas from './components/FishCanvas';
import './App.css';
import { logger } from './lib/logging';

function App() {
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    // Log to verify the component is mounting properly
    logger.info('App component mounted');

    // Add keyboard event listener for debugging
    const handleKeyUp = (e: KeyboardEvent) => {
      logger.info('App component detected keyup:', e.key);
    };

    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    logger.info('Play with fish clicked');
    setShowText(false);
  };

  return (
    <div
      className="app"
      tabIndex={-1} // Make sure it doesn't take focus from canvas
    >
      {/* The FishCanvas should always be rendered */}
      <FishCanvas />

      {showText && (
        <div className="text">
          <p>
            <b className="hello">Hello World.</b>
            <br />
            <br /> My name is Juan Cazala.
            <br />
            <br />
            I'm a Software Engineer from Argentina.
            <br />
            <br />I like making awesome stuff, if you'd like to reach out to me follow these links:
          </p>
          <ul>
            <li>
              <a href="http://github.com/cazala" target="_blank" rel="noopener noreferrer">
                gh
              </a>
            </li>
            <li>
              <a href="http://x.com/juancazala" target="_blank" rel="noopener noreferrer">
                x
              </a>
            </li>
          </ul>
          <p className="play">
            ...or you can just{' '}
            <a href="#" onClick={handlePlayClick}>
              play with the fish
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
