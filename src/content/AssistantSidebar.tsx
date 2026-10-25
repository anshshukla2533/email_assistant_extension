import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Send, RefreshCw, Undo2, Copy, Check, AlertTriangle,
    BookOpen, Gauge, MessageSquareText, Globe2, Bot, Calendar, ArrowRight,
    ShieldAlert, Sparkle, FileSignature, CheckCircle2, Search, Sliders
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

interface AssistantSidebarProps {
    /** Render inside Edge's native side panel rather than on top of Gmail. */
    nativeSidePanel?: boolean;
}

export const AssistantSidebar: React.FC<AssistantSidebarProps> = ({ nativeSidePanel = false }) => {
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
    const [generationError, setGenerationError] = useState('');
    const [copied, setCopied] = useState(false);
    const [templates] = useState<EmailTemplate[]>(BUILTIN_TEMPLATES);
    const [templateSearch, setTemplateSearch] = useState('');
    const [generatedSubjects, setGeneratedSubjects] = useState<string[]>([]);
    const [signatureRole, setSignatureRole] = useState<'Professional' | 'Minimal' | 'Corporate' | 'Student' | 'Developer'>('Professional');

    // In Edge's real side panel, Gmail's DOM belongs to a different document.
    // Route only those DOM operations through the content script.
    const gmail = <T,>(action: 'read' | 'replace' | 'subject' | 'thread', text?: string): Promise<T> => {
        if (!nativeSidePanel) {
            const local: Record<string, unknown> = {
                read: readComposeBodyText(),
                replace: text ? replaceEntireComposeBody(text) : false,
                subject: text ? setComposeSubject(text) : false,
                thread: extractThreadHistory()
            };
            return Promise.resolve(local[action] as T);
        }
        const requestId = crypto.randomUUID();
        return new Promise<T>((resolve) => {
            const listener = (message: any) => {
                if (message?.type === 'GMAIL_DOM_RESULT' && message.requestId === requestId) {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve(message.result as T);
                }
            };
            chrome.runtime.onMessage.addListener(listener);
            chrome.runtime.sendMessage({ type: 'GMAIL_DOM_ACTION', requestId, action, text });
        });
    };

    if (!nativeSidePanel && !sidebarOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        try {
            setGenerationError('');
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `You are an elite executive assistant writing emails in ${tone} tone and ${lang} language. Return clean email body text without conversational filler.`,
                userPrompt: `Write an email according to the following instruction:\n"${prompt}"`
            });

            const currentDraft = await gmail<string>('read');
            if (!await gmail<boolean>('replace', response)) {
                throw new Error('No active Gmail compose window was found.');
            }
            pushUndo(currentDraft);
            setResultText(response);
        } catch (e: any) {
            setGenerationError(e.message || 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleToneShift = async (targetTone: Tone) => {
            const current = await gmail<string>('read') || resultText;
        if (!current.trim()) {
            alert('Please write something in the email or generate draft text first.');
            return;
        }
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `You are an expert editor. Rewrite the email to have a strictly "${targetTone}" tone. Maintain all facts, dates, names, and intent. Return only the revised email.`,
                userPrompt: current
            });
            setResultText(response);
            setTone(targetTone);
        } catch (e: any) {
            alert(e.message || 'Failed to shift tone');
        } finally {
            setLoading(false);
        }
    };

    const handleReplyGenerator = async (replyIntent: string) => {
        try {
            setLoading(true);
            const thread = await gmail<string[]>('thread');
            const currentDraft = await gmail<string>('read');
            const context = thread.length > 0 ? thread.join('\n---\n') : currentDraft;

            if (!context.trim()) {
                alert('No email thread found to reply to. Open or select an email message first.');
                return;
            }

            const response = await executeAIRequest({
                systemPrompt: `You are an AI replying to an email thread. Reply intent: "${replyIntent}". Tone: ${tone}. Output only the reply body.`,
                userPrompt: `Email Thread context:\n${context}`
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Failed to generate contextual reply');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSubjects = async () => {
            const body = await gmail<string>('read') || resultText;
        if (!body.trim()) {
            alert('Please compose or generate an email body first to generate subjects.');
            return;
        }
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: 'You generate 5 distinct email subject lines: Best, Professional, Catchy, Short, and Formal. Output strictly 5 numbered lines.',
                userPrompt: `Generate subject lines for this email:\n${body}`
            });
            const lines = response.split('\n')
                .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[A-Za-z\s]+:\s*/, '').trim())
                .filter(l => l.length > 0);
            setGeneratedSubjects(lines);
        } catch (e: any) {
            alert(e.message || 'Failed to generate subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowUpGenerator = async (timing: string) => {
        const body = await gmail<string>('read') || resultText;
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `Write a polite follow-up email assuming no reply has been received after ${timing}. Maintain a courteous, professional tone. Return only the follow-up draft.`,
                userPrompt: body ? `Original email context:\n${body}` : `Write a general follow-up after ${timing}`
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Failed to generate follow-up');
        } finally {
            setLoading(false);
        }
    };

    const handleSummarize = async (mode: 'One sentence' | 'Three bullets' | 'Detailed Summary' | 'Key Action Items') => {
        const thread = await gmail<string[]>('thread');
        const activeText = thread.length > 0 ? thread.join('\n---\n') : await gmail<string>('read');
        if (!activeText.trim()) {
            alert('No email thread content found to summarize.');
            return;
        }
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `You are an executive summarizer. Summarize in format: "${mode}". Be accurate and direct.`,
                userPrompt: activeText
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Failed to summarize');
        } finally {
            setLoading(false);
        }
    };

    const handleFixGrammar = async () => {
        const current = await gmail<string>('read') || resultText;
        if (!current.trim()) return;
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: 'Fix all grammar, punctuation, spelling, repeated words, and capitalization errors. Preserve voice, layout, and line breaks. Return only the corrected text.',
                userPrompt: current
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Failed to fix grammar');
        } finally {
            setLoading(false);
        }
    };

    const handleHumanize = async () => {
        const current = await gmail<string>('read') || resultText;
        if (!current.trim()) return;
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: 'Humanize this text. Eliminate robotic boilerplate, monotonous cadence, and cliché AI phrasing. Make it sound genuine, natural, and confident while keeping the exact meaning.',
                userPrompt: current
            });
            setResultText(response);
        } catch (e: any) {
            alert(e.message || 'Failed to humanize text');
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async (targetLang: Language) => {
        const current = await gmail<string>('read') || resultText;
        if (!current.trim()) return;
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `Translate the email into ${targetLang}. Retain all formatting, spacing, and salutations identically. Output only the translation.`,
                userPrompt: current
            });
            setResultText(response);
            setLang(targetLang);
        } catch (e: any) {
            alert(e.message || 'Failed to translate');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSignature = async () => {
        try {
            setLoading(true);
            const response = await executeAIRequest({
                systemPrompt: `Generate a clean, modern email signature formatted as text. Archetype: ${signatureRole}. Provide placeholders for name, phone, title, company, and links. Return only the signature block.`,
                userPrompt: 'Generate my signature.'
            });
            setResultText(prev => prev ? `${prev}\n\n--\n${response}` : response);
        } catch (e: any) {
            alert(e.message || 'Failed to generate signature');
        } finally {
            setLoading(false);
        }
    };

    const handleInsert = async () => {
        if (!resultText) return;
        const current = await gmail<string>('read');
        pushUndo(current);
        await gmail<boolean>('replace', resultText);
    };

    const handleUndo = async () => {
        const prev = popUndo();
        if (prev !== undefined) {
            await gmail<boolean>('replace', prev);
            setResultText(prev);
        }
    };

    const handleCopy = () => {
        if (!resultText) return;
        navigator.clipboard.writeText(resultText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(templateSearch.toLowerCase())
    );

    return (
        <motion.div
            initial={nativeSidePanel ? false : { x: 420, opacity: 0 }}
            animate={nativeSidePanel ? undefined : { x: 0, opacity: 1 }}
            exit={nativeSidePanel ? undefined : { x: 420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`${nativeSidePanel ? 'h-screen w-full' : 'fixed top-0 right-0 h-screen w-[420px] z-[999999] shadow-2xl border-l'} bg-slate-900/95 text-slate-100 backdrop-blur-xl border-white/10 flex flex-col font-sans`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-wide">Gmail AI Copilot</h2>
                        <span className="text-[11px] text-indigo-400 font-medium">Category: {detectedType}</span>
                    </div>
                </div>
                {!nativeSidePanel && <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                    <X className="w-5 h-5" />
                </button>}
            </div>

            {/* Missing Attachment Alert Banner */}
            {missingAttachmentAlert && (
                <div className="mx-4 mt-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-200 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-300">Missing Attachment Detected</p>
                        <p className="text-[11px] text-amber-200/80">You mentioned attaching a document or file, but no attachments were found in Gmail compose.</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-4 pt-2 gap-1 text-xs font-medium bg-slate-950/20">
                <button
                    onClick={() => setActiveTab('generate')}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeTab === 'generate' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    <Sparkle className="w-3.5 h-3.5" /> Write
                </button>
                <button
                    onClick={() => setActiveTab('reply')}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeTab === 'reply' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    <MessageSquareText className="w-3.5 h-3.5" /> Reply
                </button>
                <button
                    onClick={() => setActiveTab('analyze')}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeTab === 'analyze' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    <Gauge className="w-3.5 h-3.5" /> Intelligence
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${activeTab === 'templates' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    <BookOpen className="w-3.5 h-3.5" /> Templates
                </button>
            </div>

            {/* Tab Panels */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'generate' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">What would you like to email?</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Ask for leave next week due to personal travel, ensure tasks are handed over to Sarah..."
                                rows={3}
                                className="w-full text-xs p-3 rounded-xl bg-slate-800/80 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tone</label>
                                <select
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value as Tone)}
                                    className="w-full p-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                                >
                                    {['Professional', 'Friendly', 'Formal', 'Casual', 'Confident', 'Persuasive', 'Apologetic', 'Polite', 'Respectful', 'Excited'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Language</label>
                                <select
                                    value={lang}
                                    onChange={(e) => handleTranslate(e.target.value as Language)}
                                    className="w-full p-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                                >
                                    {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Arabic'].map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Email
                        </button>
                        {generationError && (
                            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                {generationError}
                            </p>
                        )}

                        {/* Quick Actions Bar */}
                        <div className="pt-2 border-t border-white/10">
                            <label className="text-[11px] font-semibold text-slate-400 mb-2 block">Quick Refinements</label>
                            <div className="flex flex-wrap gap-1.5">
                                <button onClick={handleFixGrammar} className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] border border-white/5 transition">
                                    Fix Grammar
                                </button>
                                <button onClick={handleHumanize} className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] border border-white/5 transition">
                                    Humanize Writing
                                </button>
                                <button onClick={handleGenerateSubjects} className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] border border-white/5 transition">
                                    AI Subject Lines
                                </button>
                                <button onClick={() => handleFollowUpGenerator('3 Days')} className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] border border-white/5 transition">
                                    Follow-up Draft
                                </button>
                            </div>
                        </div>

                        {/* Tone Changer Pills */}
                        <div>
                            <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">One-Click Tone Shift</label>
                            <div className="flex flex-wrap gap-1">
                                {(['Professional', 'Friendly', 'Confident', 'Persuasive', 'Polite', 'Formal'] as Tone[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => handleToneShift(t)}
                                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800/60 hover:bg-indigo-900/60 border border-white/5 text-slate-300 transition"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Signature Generator */}
                        <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                                    <FileSignature className="w-3.5 h-3.5 text-indigo-400" /> Signature Builder
                                </span>
                                <select
                                    value={signatureRole}
                                    onChange={(e: any) => setSignatureRole(e.target.value)}
                                    className="text-[10px] bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-300"
                                >
                                    <option value="Professional">Professional</option>
                                    <option value="Minimal">Minimal</option>
                                    <option value="Corporate">Corporate</option>
                                    <option value="Student">Student</option>
                                    <option value="Developer">Developer</option>
                                </select>
                            </div>
                            <button
                                onClick={handleGenerateSignature}
                                className="w-full py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-white/5 transition"
                            >
                                Insert Styled Signature
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'reply' && (
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block mb-1.5">One-Click Contextual Replies</span>
                            <p className="text-[11px] text-slate-500 mb-3">Reads the full open thread history to synthesize accurate replies.</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                    { label: 'Accept / Agree', query: 'Accept or agree enthusiastically and professionally' },
                                    { label: 'Decline / Reject', query: 'Politely decline and provide courteous reasons' },
                                    { label: 'Schedule Meeting', query: 'Offer available time windows for a sync meeting' },
                                    { label: 'Need Info', query: 'Request more context and specific required details' },
                                    { label: 'Thank You', query: 'Send a warm, appreciative acknowledgment' },
                                    { label: 'Short Reply', query: 'Provide a crisp, direct 2-sentence response' }
                                ].map(r => (
                                    <button
                                        key={r.label}
                                        onClick={() => handleReplyGenerator(r.query)}
                                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-indigo-600/30 border border-white/5 text-left text-xs transition"
                                    >
                                        <span className="font-semibold text-slate-200 block">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10">
                            <label className="text-xs font-semibold text-slate-400 mb-2 block">Thread Summarizer</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleSummarize('Three bullets')}
                                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg border border-white/5"
                                >
                                    3 Key Bullets
                                </button>
                                <button
                                    onClick={() => handleSummarize('Key Action Items')}
                                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg border border-white/5"
                                >
                                    Action Items
                                </button>
                                <button
                                    onClick={() => handleSummarize('One sentence')}
                                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg border border-white/5"
                                >
                                    1-Sentence TL;DR
                                </button>
                                <button
                                    onClick={() => handleSummarize('Detailed Summary')}
                                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded-lg border border-white/5"
                                >
                                    Full Overview
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analyze' && (
                    <div className="space-y-4">
                        {/* Readability & Quality Score Card */}
                        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-slate-300">Email Quality Score</span>
                                <span className="text-lg font-black text-indigo-400">{metrics.readabilityScore}/100</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                                    style={{ width: `${metrics.readabilityScore}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500 block">Words</span>
                                    <span className="font-bold text-slate-200">{metrics.wordCount}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500 block">Sentences</span>
                                    <span className="font-bold text-slate-200">{metrics.sentenceCount}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                                    <span className="text-[10px] text-slate-500 block">Read Time</span>
                                    <span className="font-bold text-slate-200">{metrics.readingTimeMinutes}m</span>
                                </div>
                            </div>
                        </div>

                        {/* Smart Action & Calendar Detections */}
                        <div>
                            <span className="text-xs font-semibold text-slate-400 block mb-2">Detected Actions & Events</span>
                            {actionItems.length === 0 && detectedEvents.length === 0 ? (
                                <p className="text-[11px] text-slate-500 italic">No explicit deadlines or action items detected in the active email.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {actionItems.map(item => (
                                        <div key={item.id} className="p-2.5 rounded-xl bg-slate-800/70 border border-indigo-500/20 flex items-start gap-2 text-xs">
                                            <AlertTriangle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-indigo-200">{item.label}</span>
                                                <p className="text-[11px] text-slate-400">{item.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {detectedEvents.map((evt, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-slate-800/70 border border-emerald-500/20 flex items-start gap-2 text-xs">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-semibold text-emerald-300">Detected Event</span>
                                                <p className="text-[11px] text-slate-400">{evt.date} at {evt.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-800 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {filteredTemplates.map(tpl => (
                                <div
                                    key={tpl.id}
                                    onClick={() => {
                                        setResultText(tpl.body);
                                        void gmail<boolean>('subject', tpl.subject);
                                    }}
                                    className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-white/5 cursor-pointer transition space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-200">{tpl.title}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">{tpl.category}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 line-clamp-2">{tpl.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Subject suggestions list */}
                {generatedSubjects.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-2">
                        <span className="text-xs font-semibold text-indigo-300 block">Suggested Subjects</span>
                        {generatedSubjects.map((subj, index) => (
                            <div key={index} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 text-xs">
                                <span className="truncate pr-2 text-slate-300">{subj}</span>
                                <button
                                    onClick={() => void gmail<boolean>('subject', subj)}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
                                >
                                    Use
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Output & Insertion Console */}
                {resultText && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/15 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Output Preview
                            </span>
                            <div className="flex items-center gap-1">
                                {undoStack.length > 0 && (
                                    <button onClick={handleUndo} className="p-1 rounded text-slate-400 hover:text-white" title="Undo replacement">
                                        <Undo2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button onClick={handleCopy} className="p-1 rounded text-slate-400 hover:text-white" title="Copy to clipboard">
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        <textarea
                            value={resultText}
                            onChange={(e) => setResultText(e.target.value)}
                            rows={6}
                            className="w-full text-xs p-2.5 rounded-xl bg-slate-900 text-slate-200 border border-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans leading-relaxed"
                        />

                        <button
                            onClick={handleInsert}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" /> Insert Directly into Gmail Compose
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
