import React from 'react';
import ReactDOM from 'react-dom/client';
// Removing index.css import to prevent style conflicts
import App from './App.tsx';
import './index.css';
import { logger } from './lib/utils/logging.ts';
import { config } from './lib/utils/config.ts';

// Add info log for app initialization
logger.info(`App initializing in ${config.getEnvironment()} environment`);
logger.info('Main script running, mounting App component');

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  logger.info('App mounted successfully');
} else {
  logger.error('Root element not found');
}
