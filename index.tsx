import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode removed intentionally to prevent double-initialization of MediaPipe in dev
  // In production, this is fine, but for CV apps, double init can cause camera lock issues.
  <App />
);