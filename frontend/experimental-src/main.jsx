import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExperimentalApp } from './app.jsx';
import './app.css';

const root = document.getElementById('experimental-root');

if (root) {
  createRoot(root).render(<ExperimentalApp />);
}
