import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAssistantStore } from '../store/useAssistantStore';

interface Props {
    composeContainer: HTMLElement;
}

export const FloatingComposeButton: React.FC<Props> = () => {
    const { setActiveTab } = useAssistantStore();

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('generate');
                chrome.runtime.sendMessage({ type: 'OPEN_EDGE_SIDE_PANEL' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 cursor-pointer select-none"
            title="Open AI Assistant"
        >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Copilot</span>
        </button>
    );
};
