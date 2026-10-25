/**
 * Safe, battle-tested Gmail DOM driver handling composing, threads, and text insertion.
 */

export function findComposeWindows(): HTMLElement[] {
    // Gmail compose dialogs have role="dialog" or class .M9 / .aoI
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('div[role="dialog"], .aoI, .AD'));
    return dialogs.filter(el => el.querySelector('div[contenteditable="true"]') !== null);
}

export function getActiveEditable(): HTMLElement | null {
    const active = document.activeElement;
    if (active && active.getAttribute('contenteditable') === 'true') {
        return active as HTMLElement;
    }
    const composes = findComposeWindows();
    if (composes.length > 0) {
        return composes[composes.length - 1].querySelector('div[contenteditable="true"]');
    }
    return null;
}

export function insertTextIntoCompose(text: string): boolean {
    const editable = getActiveEditable();
    if (!editable) return false;

    editable.focus();
    // Safe HTML preservation
    const formattedHtml = text.replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, formattedHtml);
    editable.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

export function replaceEntireComposeBody(newText: string): boolean {
    const editable = getActiveEditable();
    if (!editable) return false;

    editable.focus();
    editable.innerHTML = newText.replace(/\n/g, '<br>');
    editable.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

export function readComposeBodyText(): string {
    const editable = getActiveEditable();
    return editable ? (editable.innerText || editable.textContent || '') : '';
}

export function setComposeSubject(subject: string): boolean {
    const composes = findComposeWindows();
    if (composes.length === 0) return false;
    const input = composes[composes.length - 1].querySelector<HTMLInputElement>('input[name="subjectbox"]');
    if (input) {
        input.value = subject;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }
    return false;
}

export function extractThreadHistory(): string[] {
    // Gmail email messages inside open thread
    const emailBodies = Array.from(document.querySelectorAll<HTMLElement>('.adn.ads, .a3s.aiL, div[dir="ltr"]'));
    return emailBodies
        .map(el => (el.innerText || '').trim())
        .filter(text => text.length > 20)
        .slice(-5); // Keep last 5 messages for context
}

export function hasAttachmentsPresent(): boolean {
    const active = findComposeWindows();
    if (active.length === 0) return false;
    // Attachment chips in Gmail compose window
    return active[active.length - 1].querySelectorAll('.vI, .a1.aaA.a3I, div[aria-label*="Attachment:"]').length > 0;
}