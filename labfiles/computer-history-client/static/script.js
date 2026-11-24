// DOM elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const resetBtn = document.getElementById('resetBtn');
const attachBtn = document.getElementById('attachBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
const imageError = document.getElementById('imageError');
const maxImageBytes = 5 * 1024 * 1024;
let selectedImage = null;

attachBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', selectImage);
removeImageBtn.addEventListener('click', () => {
    clearImage();
    attachBtn.focus();
});

function showImageError(message) {
    imageError.textContent = message;
    imageError.hidden = !message;
}

function clearImage() {
    selectedImage = null;
    imageInput.value = '';
    previewImage.removeAttribute('src');
    imagePreview.hidden = true;
    showImageError('');
}

async function selectImage() {
    const file = imageInput.files[0];
    if (!file) {
        return;
    }
    imageInput.value = '';
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
        showImageError('Only PNG and JPEG images are supported.');
        return;
    }
    if (file.size > maxImageBytes) {
        showImageError('Images must be 5 MB or smaller.');
        return;
    }
    setInputDisabled(true);
    try {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('The image could not be read. Please select it again.'));
            reader.readAsDataURL(file);
        });
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        selectedImage = { dataUrl, name: file.name };
        previewImage.src = dataUrl;
        imagePreview.hidden = false;
        showImageError('');
    } catch (error) {
        showImageError('The image could not be read. Select a valid PNG or JPEG image.');
    } finally {
        setInputDisabled(false);
        attachBtn.focus();
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
resetBtn.addEventListener('click', resetConversation);

// Keyboard accessibility: Allow Space key to activate buttons
sendBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        sendMessage();
    }
});

resetBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        resetConversation();
    }
});

// Functions
function sendMessage() {
    if (sendBtn.disabled) {
        return;
    }
    const message = messageInput.value.trim();

    if (!message) {
        showImageError('Enter a question to send with your image.');
        messageInput.focus();
        return;
    }
    showImageError('');
    const image = selectedImage;

    // Clear welcome message if present
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    // Add user message to chat
    addMessage(message, 'user', { image });

    // Disable input while processing
    setInputDisabled(true);

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    // Send to server
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            ...(image ? { image: image.dataUrl } : {})
        })
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Unable to send your message. Please try again.');
            }
            return data;
        })
        .then(data => {
            // Remove typing indicator
            typingIndicator.remove();

            if (data.error) {
                addMessage(`Error: ${data.error}`, 'agent');
            } else if (data.response_html) {
                addMessage(data.response_html, 'agent', {
                    isHtml: true, images: data.images, imageErrors: data.image_errors
                });
            } else {
                addMessage(data.response, 'agent', {
                    images: data.images, imageErrors: data.image_errors
                });
            }
            messageInput.value = '';
            clearImage();

            // Re-enable input
            setInputDisabled(false);
            messageInput.focus();
        })
        .catch(error => {
            typingIndicator.remove();
            addMessage(`Error: ${error.message}`, 'agent');
            setInputDisabled(false);
            messageInput.focus();
        });
}

function addMessage(text, sender, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.setAttribute('role', 'article');
    messageDiv.setAttribute('aria-label', `${sender === 'user' ? 'User' : 'Agent'} message`);

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = sender === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    if (options.isHtml === true) {
        const purifyLib = resolvePurifyLibrary();
        if (purifyLib) {
            content.innerHTML = sanitizeMessageHtml(text, purifyLib);
        } else {
            content.textContent = text;
            addRenderingWarning(content);
        }
    } else {
        const formattedText = renderMessageContent(text);
        content.innerHTML = formattedText;
    }

    content.querySelectorAll('a[href]').forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });
    content.querySelectorAll('img').forEach(image => {
        prepareResponseImage(image);
    });
    for (const attachment of options.images || []) {
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = attachment.dataUrl;
        image.alt = attachment.name;
        image.className = 'message-image';
        const caption = document.createElement('figcaption');
        const download = document.createElement('a');
        download.textContent = `Download ${attachment.name}`;
        download.href = attachment.dataUrl;
        download.download = attachment.name;
        caption.appendChild(download);
        figure.appendChild(image);
        figure.appendChild(caption);
        content.appendChild(figure);
        prepareResponseImage(image, true);
    }
    for (const error of options.imageErrors || []) {
        const warning = document.createElement('p');
        warning.className = 'rendering-warning';
        warning.textContent = error;
        content.appendChild(warning);
    }

    if (options.image) {
        const image = document.createElement('img');
        image.className = 'message-image';
        image.src = options.image.dataUrl;
        image.alt = `Attached image: ${options.image.name}`;
        image.addEventListener('load', scrollToBottom);
        content.appendChild(image);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Scroll again after a short delay to ensure content is fully rendered
    setTimeout(scrollToBottom, 100);
}

function renderMessageContent(text) {
    const normalizedText = String(text || '').replace(/\r\n/g, '\n');
    const markedLib = resolveMarkedLibrary();
    const purifyLib = resolvePurifyLibrary();

    if (!markedLib || !purifyLib) {
        console.error('Markdown rendering libraries are unavailable.');
        return `<p class="rendering-warning">Markdown rendering is unavailable. Showing plain text.</p>${escapeHtml(normalizedText).replace(/\n/g, '<br>')}`;
    }

    const rawHtml = markedLib.parse(normalizedText, {
        gfm: true,
        breaks: true
    });
    return sanitizeMessageHtml(rawHtml, purifyLib);
}

function sanitizeMessageHtml(rawHtml, purifyLib) {
    return purifyLib.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'src', 'alt', 'start', 'align'],
        FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select']
    });
}

function addRenderingWarning(content) {
    console.error('HTML sanitization library is unavailable.');
    const warning = document.createElement('p');
    warning.className = 'rendering-warning';
    warning.textContent = 'Markdown rendering is unavailable. Showing plain text.';
    content.prepend(warning);
}

function prepareResponseImage(image, isAttachment = false) {
    const source = image.getAttribute('src') || '';
    const safeSource = /^https?:\/\//i.test(source)
        || (isAttachment && /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(source));
    const showError = () => {
        const warning = document.createElement('span');
        warning.className = 'rendering-warning';
        warning.textContent = `Image unavailable: ${image.alt || 'agent image'}.`;
        image.replaceWith(warning);
        scrollToBottom();
    };
    if (!safeSource) {
        showError();
        return;
    }
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('load', scrollToBottom);
    image.addEventListener('error', showError, { once: true });
}

function resolveMarkedLibrary() {
    if (typeof marked === 'undefined' && typeof window === 'undefined') {
        return null;
    }

    const candidate = typeof marked !== 'undefined' ? marked : window.marked;
    if (!candidate) {
        return null;
    }

    if (typeof candidate.parse === 'function') {
        return candidate;
    }

    if (typeof candidate.marked === 'function') {
        return {
            parse: candidate.marked,
            setOptions: candidate.setOptions ? candidate.setOptions.bind(candidate) : () => { },
            Renderer: candidate.Renderer,
            Parser: candidate.Parser
        };
    }

    if (typeof candidate === 'function') {
        return {
            parse: candidate,
            setOptions: candidate.setOptions ? candidate.setOptions.bind(candidate) : () => { },
            Renderer: candidate.Renderer,
            Parser: candidate.Parser
        };
    }

    return null;
}

function resolvePurifyLibrary() {
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify;
    }

    if (typeof window !== 'undefined') {
        if (window.DOMPurify) {
            return window.DOMPurify;
        }
        if (window.dompurify && typeof window.dompurify.sanitize === 'function') {
            return window.dompurify;
        }
    }

    return null;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent';
    messageDiv.id = 'typing-indicator';
    messageDiv.setAttribute('role', 'status');
    messageDiv.setAttribute('aria-label', 'Agent is typing');
    messageDiv.setAttribute('aria-live', 'polite');

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML = '<span></span><span></span><span></span>';

    content.appendChild(indicator);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    return messageDiv;
}

function setInputDisabled(disabled) {
    messageInput.disabled = disabled;
    sendBtn.disabled = disabled;
    attachBtn.disabled = disabled;
    imageInput.disabled = disabled;
    removeImageBtn.disabled = disabled;
    resetBtn.disabled = disabled;

    // Update ARIA attributes for better screen reader support
    if (disabled) {
        sendBtn.setAttribute('aria-busy', 'true');
        messageInput.setAttribute('aria-busy', 'true');
    } else {
        sendBtn.removeAttribute('aria-busy');
        messageInput.removeAttribute('aria-busy');
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function resetConversation() {
    if (resetBtn.disabled) {
        return;
    }
    setInputDisabled(true);
    // Announce to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = 'Conversation reset';
    document.body.appendChild(announcement);

    // Call backend to reset conversation history
    fetch('/reset', {
        method: 'POST',
    })
        .then(async response => {
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Unable to reset the conversation.');
            }
            return data;
        })
        .then(data => {
            // Clear chat messages
            chatMessages.innerHTML = '<div class="welcome-message" role="status">Let\'s chat about computing history...</div>';
            clearImage();

            // Remove announcement after a short delay
            setTimeout(() => announcement.remove(), 1000);
        })
        .catch(error => {
            console.error('Error resetting conversation:', error);
            showImageError(error.message);
            announcement.textContent = 'Error resetting conversation';
            setTimeout(() => announcement.remove(), 1000);
        })
        .finally(() => {
            setInputDisabled(false);
            messageInput.focus();
        });
}

// Focus input on load
messageInput.focus();
