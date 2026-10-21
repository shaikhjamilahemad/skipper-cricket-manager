import { createRoot } from 'react-dom/client';
import { SK } from './engine';
import { app } from './app/app';
import { nav, ui } from './app/core';
import Router from './components/Router';
import Overlays from './components/Overlays';
import './styles/app.css';

// handy in the browser console and used by the UI tests: SKR.app.world, SKR.nav.cur() ...
window.SKR = { SK, app, nav, ui };

app.boot();
createRoot(document.getElementById('app')).render(<><Router /><Overlays /></>);
