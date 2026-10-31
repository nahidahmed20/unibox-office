import DOMPurify from 'dompurify';

const allowedTags = [
    'a', 'blockquote', 'br', 'em', 'h1', 'h2', 'h3', 'li', 'ol',
    'p', 's', 'strong', 'u', 'ul',
];

export default function sanitizeHtml(html) {
    return DOMPurify.sanitize(typeof html === 'string' ? html : '', {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ['href'],
        ALLOW_DATA_ATTR: false,
    });
}
