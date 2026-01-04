import FishCanvas from './components/Canvas';
import './App.css';

function App() {
  return (
    <div
      className="app"
      tabIndex={-1} // Make sure it doesn't take focus from canvas
    >
      {/* The FishCanvas should always be rendered */}
      <FishCanvas />
      <div className="text">
        <p>
          <b className="hello">Hello World.</b>
          <br />
          <br /> My name is Juan Cazala.
          <br />
          <br />
          I'm a Software Engineer from Argentina.
          <br />
          <br />I like making cool stuff, if you'd like to reach out to me follow these links:
        </p>
        <ul>
          <li>
            <a href="http://github.com/cazala" target="_blank" rel="noopener noreferrer">
              github
            </a>
          </li>
          <li>
            <a href="http://x.com/juancazala" target="_blank" rel="noopener noreferrer">
              x
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
