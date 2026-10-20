import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Practice from '../../src/pages/Practice.jsx';
import PracticeBank from '../../src/pages/PracticeBank.jsx';
import '../../src/index.css';

const bank = new URLSearchParams(location.search).get('bank');
history.replaceState({}, '', bank === '/practice-bank' ? bank : '/practice');
createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><Routes>
    <Route path="/practice" element={<Practice />} />
    <Route path="/practice-bank" element={<PracticeBank />} />
  </Routes></BrowserRouter></StrictMode>,
);
