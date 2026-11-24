"""
Flask Application for Computing History Agent Client.

This is the main Flask application that provides a web interface
for interacting with the Computing History agent.
"""

import base64
import binascii
from functools import partial

from flask import Flask, render_template, request, jsonify
import markdown
import bleach
from bleach.linkifier import LinkifyFilter
from agent_client import AgentClient

app = Flask(__name__)
MAX_IMAGE_BYTES = 5 * 1024 * 1024
app.config['MAX_CONTENT_LENGTH'] = 4 * ((MAX_IMAGE_BYTES + 2) // 3) + 100000


@app.errorhandler(413)
def request_too_large(error):
    return jsonify({'error': 'Request too large. Images must be 5 MB or smaller.'}), 413


def validate_image(image_url):
    """Validate a base64 image before passing it to the agent."""
    if not isinstance(image_url, str):
        raise ValueError('Attach a PNG or JPEG image.')
    header, separator, encoded = image_url.partition(',')
    signatures = {
        'data:image/png;base64': b'\x89PNG\r\n\x1a\n',
        'data:image/jpeg;base64': b'\xff\xd8\xff'
    }
    if not separator or header not in signatures:
        raise ValueError('Only PNG and JPEG images are supported.')
    if len(encoded) > 4 * ((MAX_IMAGE_BYTES + 2) // 3):
        raise ValueError('Images must be 5 MB or smaller.')
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as error:
        raise ValueError('The image could not be read. Select a PNG or JPEG image.') from error
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError('Images must be 5 MB or smaller.')
    if not image_bytes.startswith(signatures[header]):
        raise ValueError('The file does not match its PNG or JPEG image type.')


def _set_external_link_attributes(attrs, new=False):
    """Force safe external link attributes for rendered markdown links."""
    href_key = (None, 'href')
    href_value = attrs.get(href_key, '')
    if isinstance(href_value, str) and href_value.startswith(('http://', 'https://')):
        attrs[(None, 'target')] = '_blank'
        attrs[(None, 'rel')] = 'noopener noreferrer nofollow'
    return attrs


def render_markdown_to_safe_html(text: str) -> str:
    """Convert markdown to safe HTML for display in chat bubbles."""
    raw_html = markdown.markdown(
        text,
        extensions=['extra', 'sane_lists', 'nl2br']
    )

    allowed_tags = [
        'p', 'br', 'hr', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'strong', 'em', 'code', 'pre',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ]
    allowed_attrs = {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title'],
        'ol': ['start'],
        'th': ['align'],
        'td': ['align'],
        'code': ['class']
    }

    cleaner = bleach.Cleaner(
        tags=allowed_tags,
        attributes=allowed_attrs,
        protocols=['http', 'https', 'mailto'],
        strip=True,
        filters=[partial(
            LinkifyFilter,
            skip_tags=['pre', 'code'],
            callbacks=[_set_external_link_attributes]
        )]
    )
    return cleaner.clean(raw_html)

# Initialize the agent client
try:
    agent = AgentClient()
except Exception as e:
    print(f"Warning: Failed to initialize agent client: {e}")
    agent = None

@app.route('/')
def index():
    """Render the main chat interface."""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages from the user."""
    if not agent:
        return jsonify({
            'error': 'Agent client not initialized. Check your .env configuration.'
        }), 500
    
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('message'), str):
        return jsonify({'error': 'Message is required'}), 400
    user_message = data['message'].strip()
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
    
    # Validate message length to prevent abuse
    if len(user_message) > 10000:
        return jsonify({'error': 'Message too long'}), 400

    image_url = data.get('image')
    if image_url is not None:
        try:
            validate_image(image_url)
        except ValueError as error:
            return jsonify({'error': str(error)}), 400
    
    # Note: We do NOT escape HTML here because:
    # 1. The agent needs to receive the raw text to understand it properly
    # 2. HTML escaping is performed on the frontend when displaying messages
    # 3. This follows the principle: escape at the point of use (display), not at input
    try:
        response = agent.send_message(user_message, image_url)
    except RuntimeError as error:
        return jsonify({'error': str(error)}), 502
    response_html = render_markdown_to_safe_html(response.text)

    return jsonify({
        'response': response.text,
        'response_html': response_html,
        'images': response.images,
        'image_errors': response.image_errors
    })

@app.route('/reset', methods=['POST'])
def reset():
    """Reset the conversation history."""
    if agent:
        agent.reset_conversation()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=False, port=5000)
