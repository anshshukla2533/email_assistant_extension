import { ReadabilityMetrics, DetectedActionItem, DetectedEvent } from '../types';

export function computeReadabilityMetrics(text: string): ReadabilityMetrics {
    const trimmed = text.trim();
    if (!trimmed) {
        return {
            wordCount: 0,
            sentenceCount: 0,
            paragraphCount: 0,
            readingTimeMinutes: 0,
            readabilityScore: 100,
            formalityScore: 50,
            concisenessScore: 100
        };
    }

    const words = trimmed.match(/\b[^\s]+\b/g) || [];
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    const paragraphs = trimmed.split(/\n+/).filter(p => p.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const paragraphCount = Math.max(1, paragraphs.length);
    const readingTimeMinutes = parseFloat((wordCount / 200).toFixed(1));

    // Syllables estimation
    let syllables = 0;
    for (const word of words) {
        const cleanWord = word.toLowerCase().replace(/(?:[^laeiouy]|ed|es|e)$/, '');
        const matches = cleanWord.match(/[aeiouy]{1,2}/g);
        syllables += matches ? matches.length : 1;
    }

    // Flesch Reading Ease
    const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / Math.max(1, wordCount));
    const readabilityScore = Math.min(100, Math.max(0, Math.round(score)));

    // Formality heuristic based on vocabulary & contraction absence
    const contractions = (trimmed.match(/\b(can't|won't|don't|it's|I'm|you're)\b/gi) || []).length;
    const formalMarkers = (trimmed.match(/\b(furthermore|moreover|sincerely|regarding|kindly|consequently)\b/gi) || []).length;
    const formalityScore = Math.min(100, Math.max(10, Math.round(50 + (formalMarkers * 10) - (contractions * 8))));

    // Conciseness
    const avgSentenceLength = wordCount / sentenceCount;
    const concisenessScore = Math.min(100, Math.max(10, Math.round(110 - avgSentenceLength * 2.5)));

    return {
        wordCount,
        sentenceCount,
        paragraphCount,
        readingTimeMinutes,
        readabilityScore,
        formalityScore,
        concisenessScore
    };
}

export function detectMissingAttachment(text: string, hasAttachmentsInDom: boolean): boolean {
    if (hasAttachmentsInDom) return false;
    const regex = /\b(i('ve| have)?\s+attached|please\s+find\s+attached|attached\s+(is|are|file|document|pdf)|see\s+the\s+attachment)\b/i;
    return regex.test(text);
}

export function detectEvents(text: string): DetectedEvent[] {
    const events: DetectedEvent[] = [];
    const dateRegex = /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?\b/gi;
    const timeRegex = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b/g;

    const dates = text.match(dateRegex);
    const times = text.match(timeRegex);

    if (dates || times) {
        events.push({
            date: dates ? dates[0] : 'Upcoming date',
            time: times ? times[0] : 'Specified time',
            subject: 'Detected meeting or scheduling detail in email'
        });
    }
    return events;
}

export function detectActionItems(text: string): DetectedActionItem[] {
    const items: DetectedActionItem[] = [];

    if (/\b(please\s+(reply|let\s+me\s+know|respond|confirm))\b/i.test(text)) {
        items.push({ id: '1', label: 'Reply Needed', detail: 'Sender requested a reply or confirmation.' });
    }
    if (/\b(schedule|meeting|zoom|google\s+meet|call|sync)\b/i.test(text)) {
        items.push({ id: '2', label: 'Meeting Request', detail: 'A call or meeting discussion was mentioned.' });
    }
    if (/\b(by\s+(tomorrow|end\s+of\s+day|eod|friday|monday)|\bdue\s+date\b|\bdeadline\b)/i.test(text)) {
        items.push({ id: '3', label: 'Deadline', detail: 'A time constraint or deadline was identified.' });
    }
    if (/\b(invoice|payment|usd|eur|bank|wire|receipt)\b/i.test(text)) {
        items.push({ id: '4', label: 'Payment Mentioned', detail: 'Billing, invoice, or financial items referenced.' });
    }
    if (/\b(approve|approval|sign|review\s+and\s+sign)\b/i.test(text)) {
        items.push({ id: '5', label: 'Approval Needed', detail: 'Explicit signoff or approval is awaited.' });
    }

    return items;
}