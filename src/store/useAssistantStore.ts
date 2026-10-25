import { create } from 'zustand';
import {
    EmailType,
    Tone,
    ReadabilityMetrics,
    DetectedActionItem,
    DetectedEvent
} from '../types';
import {
    computeReadabilityMetrics,
    detectMissingAttachment,
    detectActionItems,
    detectEvents
} from '../services/analyzerService';

interface AssistantState {
    sidebarOpen: boolean;
    activeTab: 'generate' | 'reply' | 'analyze' | 'templates';
    isLoading: boolean;
    error: string | null;

    // Compose State
    currentEmailText: string;
    detectedType: EmailType;
    missingAttachmentAlert: boolean;
    metrics: ReadabilityMetrics;
    actionItems: DetectedActionItem[];
    detectedEvents: DetectedEvent[];
    subjectOptions: string[];
    lastGeneratedText: string;
    undoStack: string[];

    // Selection Floating State
    selectedText: string;
    selectionCoords: { top: number; left: number } | null;

    // Actions
    setSidebarOpen: (open: boolean) => void;
    setActiveTab: (tab: 'generate' | 'reply' | 'analyze' | 'templates') => void;
    setLoading: (loading: boolean) => void;
    setError: (err: string | null) => void;
    setSelectedText: (text: string, coords: { top: number; left: number } | null) => void;
    updateEmailContext: (text: string, hasAttachmentsInDom: boolean) => void;
    setSubjectOptions: (options: string[]) => void;
    setLastGeneratedText: (text: string) => void;
    pushUndo: (previousText: string) => void;
    popUndo: () => string | undefined;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
    sidebarOpen: false,
    activeTab: 'generate',
    isLoading: false,
    error: null,

    currentEmailText: '',
    detectedType: 'General',
    missingAttachmentAlert: false,
    metrics: computeReadabilityMetrics(''),
    actionItems: [],
    detectedEvents: [],
    subjectOptions: [],
    lastGeneratedText: '',
    undoStack: [],

    selectedText: '',
    selectionCoords: null,

    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setSelectedText: (selectedText, selectionCoords) => set({ selectedText, selectionCoords }),

    updateEmailContext: (text: string, hasAttachmentsInDom: boolean) => {
        const metrics = computeReadabilityMetrics(text);
        const missingAttachmentAlert = detectMissingAttachment(text, hasAttachmentsInDom);
        const actionItems = detectActionItems(text);
        const detectedEvents = detectEvents(text);

        // Heuristic categorization
        let detectedType: EmailType = 'General';
        if (/interview|hiring|recruiter/i.test(text)) detectedType = 'Interview';
        else if (/job\s+application|resume|curriculum\s+vitae/i.test(text)) detectedType = 'Job Application';
        else if (/intern|internship/i.test(text)) detectedType = 'Internship';
        else if (/leave|vacation|out\s+of\s+office/i.test(text)) detectedType = 'Leave Request';
        else if (/following\s+up|circle\s+back/i.test(text)) detectedType = 'Follow Up';
        else if (/complaint|issue|dissatisfied/i.test(text)) detectedType = 'Complaint';
        else if (/meeting|calendar|zoom|reschedule/i.test(text)) detectedType = 'Meeting';

        set({
            currentEmailText: text,
            metrics,
            missingAttachmentAlert,
            actionItems,
            detectedEvents,
            detectedType
        });
    },

    setSubjectOptions: (subjectOptions) => set({ subjectOptions }),
    setLastGeneratedText: (lastGeneratedText) => set({ lastGeneratedText }),

    pushUndo: (prev: string) => {
        const { undoStack } = get();
        set({ undoStack: [...undoStack, prev].slice(-10) });
    },

    popUndo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return undefined;
        const last = undoStack[undoStack.length - 1];
        set({ undoStack: undoStack.slice(0, -1) });
        return last;
    }
}));