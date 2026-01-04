import React from 'react';
import ReactDOM from 'react-dom/client';
// Removing index.css import to prevent style conflicts
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
