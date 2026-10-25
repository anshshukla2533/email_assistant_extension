import React from 'react';
import { createRoot } from 'react-dom/client';
import { AssistantSidebar } from '../content/AssistantSidebar';
import '../styles/globals.css';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AssistantSidebar nativeSidePanel />
    </React.StrictMode>
);
