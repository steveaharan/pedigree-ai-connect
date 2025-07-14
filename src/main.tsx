/**
/* © 2024 University of Cambridge. All rights reserved.  
**/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import './tailwind.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
) 