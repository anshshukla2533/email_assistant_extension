import { DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '../storage/chromeStorage';

chrome.runtime.onInstalled.addListener(async (details) => {
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
        chrome.tabs.sendMessage(tab.id, {
            type: 'OPEN_SIDEBAR_WITH_TEXT',
            text: info.selectionText || ''
        });
    }
});

// Handle commands/keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-copilot') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_COPILOT' });
            }
        });
    }
});