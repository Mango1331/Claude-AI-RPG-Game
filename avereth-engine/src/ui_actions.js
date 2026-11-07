// Composer-only shortcuts. A click cannot send a message or call any engine/provider API.
const INSTALLED = Symbol.for('avereth.composer-drafts');
export function installDraftActions(root = document) {
    if (typeof root?.addEventListener !== 'function' || typeof root.contains !== 'function' || root[INSTALLED]) return false;
    const doc = root.nodeType === 9 ? root : root.ownerDocument;
    const handler = event => {
        const button = event.target?.closest?.('button[data-avereth-draft]');
        if (!button || !root.contains(button)) return;
        const field = doc.getElementById('send_textarea'), draft = button.getAttribute('data-avereth-draft');
        if (!field || field.disabled || field.readOnly || !draft) return;
        event.preventDefault();
        if (!field.value.split('\n').includes(draft)) {
            field.value += `${field.value && !field.value.endsWith('\n') ? '\n' : ''}${draft}`;
            field.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
        }
        field.focus(); field.setSelectionRange(field.value.length, field.value.length);
    };
    root.addEventListener('click', handler);
    Object.defineProperty(root, INSTALLED, { value: handler, configurable: true });
    return true;
}
