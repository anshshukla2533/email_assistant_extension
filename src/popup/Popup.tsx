import React, { useEffect, useState } from 'react';
import { Sparkles, Settings, ExternalLink, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { getStoredSettings } from '../storage/chromeStorage';
import { UserSettings } from '../types';

export const Popup: React.FC = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        getStoredSettings().then(setSettings);
    }, []);

    return (
        <div className="p-4 flex flex-col justify-between h-[380px] font-sans">
            <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-600">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xs font-bold tracking-wide">AI Email Copilot</h1>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Manifest V3 Active
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => chrome.runtime.openOptionsPage()}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                        <span className="text-[11px] text-slate-400">Current AI Engine</span>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase text-indigo-300">{settings?.provider || 'None'}</span>
                            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{settings?.model || 'Not configured'}</span>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                        <span className="text-[11px] text-slate-400">Status in Gmail</span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-200">
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Ready inside Gmail Compose</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <button
                    onClick={() => chrome.tabs.create({ url: 'https://mail.google.com' })}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                    Open Gmail <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <p className="text-[10px] text-center text-slate-500">Press Alt + C in Gmail to toggle sidebar</p>
            </div>
        </div>
    );
};