import { DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '../storage/chromeStorage';

chrome.runtime.onInstalled.addListener(async (details) => {
    // On Edge, this puts the UI in the browser's real side panel.  The browser
    // reserves space for it, so Gmail is resized instead of being covered.
    await chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
    if (details.reason === 'install') {
        const existing = await getStoredSettings();
        await saveStoredSettings({ ...DEFAULT_SETTINGS, ...existing });
        chrome.runtime.openOptionsPage();
    }

    // Create context menu for quick rewrites
    chrome.contextMenus.create({
        id: 'ai-copilot-rewrite',
        title: 'Rewrite with AI Copilot',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ai-copilot-rewrite' && tab?.id) {
        chrome.sidePanel?.open({ tabId: tab.id });
    }
});

// Handle commands/keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-copilot') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) chrome.sidePanel?.open({ tabId: tabs[0].id });
        });
    }
});

// Called from the Gmail compose button.  Opening through this click retains a
// user gesture, which Edge requires for chrome.sidePanel.open().
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type === 'OPEN_EDGE_SIDE_PANEL' && sender.tab?.id) {
        chrome.sidePanel?.open({ tabId: sender.tab.id });
    }

    // The native panel cannot touch Gmail's DOM directly. Relay its compose
    // operations to the content script in the currently active Gmail tab.
    if (message?.type === 'GMAIL_DOM_ACTION') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs.find(candidate => candidate.url?.startsWith('https://mail.google.com/'));
            if (!tab?.id) return;
            chrome.tabs.sendMessage(tab.id, message, (result) => {
                if (chrome.runtime.lastError) return;
                chrome.runtime.sendMessage({ type: 'GMAIL_DOM_RESULT', requestId: message.requestId, result });
            });
        });
    }
});
