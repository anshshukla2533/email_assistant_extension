export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'custom';

export type Tone =
    | 'Professional' | 'Friendly' | 'Formal' | 'Casual'
    | 'Confident' | 'Persuasive' | 'Apologetic' | 'Polite'
    | 'Respectful' | 'Excited';

export type EmailType =
    | 'Job Application' | 'Interview' | 'Follow Up' | 'Meeting'
    | 'Complaint' | 'Support' | 'Sales' | 'Networking'
    | 'Leave Request' | 'Internship' | 'Scholarship' | 'Invitation' | 'Feedback' | 'General';

export type Language =
    | 'English' | 'Hindi' | 'Spanish' | 'French'
    | 'German' | 'Japanese' | 'Chinese' | 'Arabic';

export interface UserSettings {
    provider: AIProvider;
    apiKey: string;
    model: string;
    customEndpoint?: string;
    temperature: number;
    maxTokens: number;
    theme: 'light' | 'dark' | 'system';
    defaultTone: Tone;
    defaultLanguage: Language;
}

export interface ReadabilityMetrics {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    readingTimeMinutes: number;
    readabilityScore: number; // 0 - 100
    formalityScore: number;   // 0 - 100
    concisenessScore: number; // 0 - 100
}

export interface QualityAnalysis {
    overallScore: number;
    grammarIssues: string[];
    toneAlignment: string;
    clarityTips: string[];
    hasCallToAction: boolean;
}

export interface DetectedActionItem {
    id: string;
    label: 'Reply Needed' | 'Meeting Request' | 'Deadline' | 'Approval Needed' | 'Document Requested' | 'Payment Mentioned';
    detail: string;
}

export interface DetectedEvent {
    date?: string;
    time?: string;
    subject?: string;
}

export interface EmailTemplate {
    id: string;
    title: string;
    category: string;
    subject: string;
    body: string;
    isFavorite?: boolean;
}