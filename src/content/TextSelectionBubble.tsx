import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Wand2, Check } from 'lucide-react';
import { useAssistantStore } from '../store/useAssistantStore';
import { executeAIRequest } from '../services/aiService';

export const TextSelectionBubble: React.FC = () => {
    const { selectedText, selectionCoords, setSelectedText, pushUndo } = useAssistantStore();
    const [loading, setLoading] = React.useState(false);

    if (!selectionCoords || !selectedText || selectedText.trim().length === 0) {
        return null;
    }

    const handleRewrite = async (instruction: string) => {
        try {
            setLoading(true);
            const prompt = `Rewrite the following text from an email:\n"${selectedText}"\n\nInstruction: ${instruction}\nProvide only the rewritten text directly without explanation.`;
            const result = await executeAIRequest({
                systemPrompt: 'You are an elite email editor. Return only rewritten text.',
                userPrompt: prompt
            });

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                pushUndo(selectedText);
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(result));
                setSelectedText('', null);
            }
        } catch (err: any) {
            alert(err.message || 'Error rewriting text');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    position: 'fixed',
                    top: Math.max(10, selectionCoords.top - 48),
                    left: Math.max(10, selectionCoords.left),
                    zIndex: 999999
                }}
                className="glass-panel-dark text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1 border border-white/20 text-xs backdrop-blur-md"
            >
                <div className="flex items-center gap-1 px-2 font-medium text-indigo-300">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI Rewrite:</span>
                </div>

                {loading ? (
                    <div className="px-3 py-1 flex items-center gap-1.5 text-zinc-300">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>Transforming...</span>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => handleRewrite('Improve clarity and flow, making it sound professional')}
                            className="px-2 py-1 rounded hover:bg-white/10 transition"
                        >
                            Improve
                        </button>
                        <button
                            onClick={() => handleRewrite('Make this concise and shorter while keeping key facts')}
                            className="px-2 py-1 rounded hover:bg-white/10 transition"
                        >
                            Shorten
                        </button>
                        <button
                            onClick={() => handleRewrite('Make this sound polite and professional')}
                            className="px-2 py-1 rounded hover:bg-white/10 transition"
                        >
                            Polite
                        </button>
                        <button
                            onClick={() => handleRewrite('Fix all grammar, punctuation, and wording faults')}
                            className="px-2 py-1 rounded hover:bg-white/10 transition"
                        >
                            Fix Grammar
                        </button>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
