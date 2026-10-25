import { UserSettings, EmailTemplate } from '../types';

const SETTINGS_KEY = 'ai_email_copilot_settings';
const TEMPLATES_KEY = 'ai_email_copilot_templates';
const HISTORY_KEY = 'ai_email_copilot_history';

export const DEFAULT_SETTINGS: UserSettings = {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1024,
    theme: 'system',
    defaultTone: 'Professional',
    defaultLanguage: 'English'
};

export const BUILTIN_TEMPLATES: EmailTemplate[] = [
    {
        id: 'leave-req',
        title: 'Leave Application',
        category: 'Work',
        subject: 'Leave Application: [Your Name] - [Dates]',
        body: 'Dear [Manager Name],\n\nI am writing to formally request leave from [Start Date] to [End Date] due to [Reason]. I have ensured my active tasks are covered by [Colleague Name].\n\nKind regards,\n[Your Name]'
    },
    {
        id: 'intern-req',
        title: 'Internship Request',
        category: 'Career',
        subject: 'Inquiry: Internship Opportunities in [Department] - [Your Name]',
        body: 'Dear [Hiring Manager/Team],\n\nI am an aspiring [Role/Major] with proven background in [Skills]. I have long admired [Company]’s work on [Project/Initiative], and I would love the chance to contribute as an intern.\n\nBest regards,\n[Your Name]'
    },
    {
        id: 'followup-general',
        title: 'Follow Up',
        category: 'General',
        subject: 'Following up on our conversation regarding [Subject]',
        body: 'Hi [Name],\n\nI wanted to circle back on our previous discussion regarding [Subject]. Looking forward to hearing your thoughts once you have had a chance to review.\n\nThank you,\n[Your Name]'
    }
];

export async function getStoredSettings(): Promise<UserSettings> {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

export async function saveStoredSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function getStoredTemplates(): Promise<EmailTemplate[]> {
    const result = await chrome.storage.sync.get(TEMPLATES_KEY);
    return result[TEMPLATES_KEY] || BUILTIN_TEMPLATES;
}

export async function saveStoredTemplates(templates: EmailTemplate[]): Promise<void> {
    await chrome.storage.sync.set({ [TEMPLATES_KEY]: templates });
}

export async function pushPromptHistory(prompt: string): Promise<void> {
    const res = await chrome.storage.local.get(HISTORY_KEY);
    const history: string[] = res[HISTORY_KEY] || [];
    const updated = [prompt, ...history.filter(h => h !== prompt)].slice(0, 20);
    await chrome.storage.local.set({ [HISTORY_KEY]: updated });
}

export async function getPromptHistory(): Promise<string[]> {
    const res = await chrome.storage.local.get(HISTORY_KEY);
    return res[HISTORY_KEY] || [];
}