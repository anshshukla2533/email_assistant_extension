import React, { useEffect, useState } from 'react';
import { Save, Check, Key, Sliders, ShieldAlert, Cpu } from 'lucide-react';
import { getStoredSettings, saveStoredSettings } from '../storage/chromeStorage';
import { UserSettings, AIProvider, Tone, Language } from '../types';

export const Options: React.FC = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getStoredSettings().then(setSettings);
    }, []);

    if (!settings) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveStoredSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-8">
                <div>
                    <h1 className="text-xl font-bold">Extension Configuration</h1>
                    <p className="text-xs text-slate-400 mt-1">Configure your AI providers, API endpoints, tokens, and default behaviors.</p>
                </div>
                {saved && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                        <Check className="w-3.5 h-3.5" /> Saved successfully
                    </span>
                )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Provider Selection */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-semibold">AI Intelligence Engine</h2>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {(['openai', 'gemini', 'anthropic', 'custom'] as AIProvider[]).map((p) => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => setSettings({ ...settings, provider: p })}
                                className={`py-2 text-xs font-semibold uppercase rounded-xl border transition ${settings.provider === p
                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                                        : 'border-white/5 bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">API Key</label>
                        <div className="relative">
                            <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                            <input
                                type="password"
                                value={settings.apiKey}
                                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                                placeholder="sk-..."
                                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Stored securely in Chrome's encrypted local sync store.</p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">Model Name</label>
                        <input
                            type="text"
                            value={settings.model}
                            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                            placeholder="e.g. gpt-4o-mini, gemini-1.5-flash, or claude-3-5-sonnet-20241022"
                            className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {settings.provider === 'custom' && (
                        <div>
                            <label className="text-xs font-medium text-slate-300 block mb-1">Custom OpenAI-compatible Endpoint</label>
                            <input
                                type="text"
                                value={settings.customEndpoint || ''}
                                onChange={(e) => setSettings({ ...settings, customEndpoint: e.target.value })}
                                placeholder="https://api.together.xyz/v1/chat/completions"
                                className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                {/* Model Parameters */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-semibold">Inference Parameters</h2>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Temperature</span>
                            <span className="text-indigo-400 font-bold">{settings.temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.temperature}
                            onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Max Tokens</span>
                            <span className="text-indigo-400 font-bold">{settings.maxTokens}</span>
                        </div>
                        <input
                            type="range"
                            min="256"
                            max="4096"
                            step="128"
                            value={settings.maxTokens}
                            onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
                            className="w-full accent-indigo-500"
                        />
                    </div>
                </div>

                {/* Preferences */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
                    <h2 className="text-sm font-semibold">Defaults</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-300 block mb-1">Default Tone</label>
                            <select
                                value={settings.defaultTone}
                                onChange={(e) => setSettings({ ...settings, defaultTone: e.target.value as Tone })}
                                className="w-full p-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100"
                            >
                                {['Professional', 'Friendly', 'Formal', 'Casual', 'Confident', 'Persuasive', 'Apologetic', 'Polite', 'Respectful', 'Excited'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-300 block mb-1">Default Language</label>
                            <select
                                value={settings.defaultLanguage}
                                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value as Language })}
                                className="w-full p-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100"
                            >
                                {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Arabic'].map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl transition cursor-pointer"
                >
                    <Save className="w-4 h-4" /> Save Settings
                </button>
            </form>
        </div>
    );
};