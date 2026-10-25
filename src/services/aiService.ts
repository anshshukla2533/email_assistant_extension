import { UserSettings } from '../types';
import { getStoredSettings } from '../storage/chromeStorage';

interface RequestOptions {
    systemPrompt?: string;
    userPrompt: string;
}

export async function executeAIRequest(options: RequestOptions): Promise<string> {
    const settings = await getStoredSettings();

    if (!settings.apiKey) {
        throw new Error('API Key missing. Please configure your key in extension Options.');
    }

    const { provider, apiKey, model, temperature, maxTokens, customEndpoint } = settings;

    switch (provider) {
        case 'openai':
        case 'custom': {
            const endpoint = customEndpoint?.trim() || 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    messages: [
                        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                        { role: 'user', content: options.userPrompt }
                    ],
                    temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `OpenAI error: status ${response.status}`);
            }
            const data = await response.json();
            const content = data.choices[0]?.message?.content?.trim();
            if (!content) throw new Error('OpenAI returned an empty response.');
            return content;
        }

        case 'gemini': {
            const geminiModel = model || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${options.systemPrompt ? options.systemPrompt + '\n\n' : ''}${options.userPrompt}` }]
                        }
                    ],
                    generationConfig: {
                        temperature,
                        maxOutputTokens: maxTokens
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
            }
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!content) throw new Error('Gemini returned an empty response.');
            return content;
        }

        case 'anthropic': {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20241022',
                    max_tokens: maxTokens,
                    temperature,
                    system: options.systemPrompt,
                    messages: [{ role: 'user', content: options.userPrompt }]
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
            }
            const data = await response.json();
            const content = data.content?.[0]?.text?.trim();
            if (!content) throw new Error('Anthropic returned an empty response.');
            return content;
        }

        default:
            throw new Error(`Unsupported AI Provider: ${provider}`);
    }
}
