import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Send, RefreshCw, Undo2, Copy, Check, AlertTriangle,
    BookOpen, Gauge, MessageSquareText, Globe2, Bot, Calendar, ArrowRight
} from 'lucide-react';
import { useAssistantStore } from '../store/useAssistantStore';
import { executeAIRequest } from '../services/aiService';
import {
    insertTextIntoCompose,
    replaceEntireComposeBody,
    setComposeSubject,
    readComposeBodyText,
    extractThreadHistory
} from './gmailDOM';
import { Tone, Language, EmailTemplate } from '../types';
import { BUILTIN_TEMPLATES } from '../storage/chromeStorage';

export const AssistantSidebar: React.FC = () => {
    const {
        sidebarOpen, setSidebarOpen, activeTab, setActiveTab,
        metrics, missingAttachmentAlert, detectedType, actionItems,
        detectedEvents, undoStack, popUndo, pushUndo
    } = useAssistantStore();

    const [prompt, setPrompt] = useState('');
    const [tone, setTone] = useState<Tone>('Professional');
    const [lang, setLang] = useState<Language>('English');
    const [loading, setLoading] = useState(false);
    const [resultText, setResultText] = useState('');
    const [copied, setCopied] = useState(false);
    const [templates] = useState<EmailTemplate[]>(BUILTIN_TEMPLATES);
    const [templateSearch, setTemplateSearch] = useState('');

    if (!sidebarOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `You are an elite executive assistant writing emails in ${tone} tone and ${lang} language. Return clean email body text without conversational filler.`,
                userPrompt: `Write an email according to the following instruction:\n"${prompt}"`
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Generation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleToneShift = async (targetTone: Tone) => {
        const current = readComposeBodyText() || resultText;