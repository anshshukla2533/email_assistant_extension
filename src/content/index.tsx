import React from 'react';
import { createRoot } from 'react-dom/client';
import { AssistantSidebar } from './AssistantSidebar';
import { FloatingComposeButton } from './FloatingComposeButton';
import { TextSelectionBubble } from './TextSelectionBubble';
import { useAssistantStore } from '../store/useAssistantStore';
import {
    findComposeWindows,
    readComposeBodyText,
    hasAttachmentsPresent,
    replaceEntireComposeBody,
    setComposeSubject,
    extractThreadHistory
} from './gmailDOM';
import '../styles/globals.css';

const SIDEBAR_ROOT_ID = 'ai-copilot-sidebar-root';
const SELECTION_ROOT_ID = 'ai-copilot-selection-root';

function initExtension() {

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'GMAIL_DOM_ACTION') return;
        switch (message.action) {
            case 'read': sendResponse(readComposeBodyText()); break;
            case 'replace': sendResponse(replaceEntireComposeBody(message.text)); break;
            case 'subject': sendResponse(setComposeSubject(message.text)); break;
            case 'thread': sendResponse(extractThreadHistory()); break;
            default: sendResponse(null);
        }
    });

    let sidebarContainer = document.getElementById(SIDEBAR_ROOT_ID);
    if (!sidebarContainer) {
        sidebarContainer = document.createElement('div');
        sidebarContainer.id = SIDEBAR_ROOT_ID;
        document.body.appendChild(sidebarContainer);
        const root = createRoot(sidebarContainer);
        root.render(<AssistantSidebar />);
    }


    let selectionContainer = document.getElementById(SELECTION_ROOT_ID);
    if (!selectionContainer) {
        selectionContainer = document.createElement('div');
        selectionContainer.id = SELECTION_ROOT_ID;
        document.body.appendChild(selectionContainer);
        const root = createRoot(selectionContainer);
        root.render(<TextSelectionBubble />);
    }


    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            useAssistantStore.getState().setSelectedText('', null);
            return;
        }

        const text = selection.toString().trim();
        if (text.length > 5) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            useAssistantStore.getState().setSelectedText(text, {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            });
        }
    });

    const observer = new MutationObserver(() => {
        const composes = findComposeWindows();
        composes.forEach((compose) => {

            const toolbar = compose.querySelector<HTMLElement>('tr.btC, td.gU.Up, .aDh');
            if (toolbar && !toolbar.querySelector('.ai-copilot-button-mounted')) {
                const btnContainer = document.createElement('div');
                btnContainer.className = 'ai-copilot-button-mounted inline-block ml-2';
                toolbar.appendChild(btnContainer);
                const root = createRoot(btnContainer);
                root.render(<FloatingComposeButton composeContainer={compose} />);
            }


            const text = readComposeBodyText();
            const hasAttachments = hasAttachmentsPresent();
            useAssistantStore.getState().updateEmailContext(text, hasAttachments);
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}
