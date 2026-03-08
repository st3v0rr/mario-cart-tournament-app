/**
 * Simple markdown-to-HTML renderer.
 * Supports: headings, bold, italic, code, links, unordered lists, paragraphs.
 * HTML in the input is escaped before processing — no XSS risk.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

export function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const parts = [];
  let inList = false;

  for (const line of lines) {
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const li = line.match(/^[-*] (.+)/);
    const empty = line.trim() === '';

    if (inList && !li) {
      parts.push('</ul>');
      inList = false;
    }

    if (h3) {
      parts.push(`<h3>${formatInline(escapeHtml(h3[1]))}</h3>`);
    } else if (h2) {
      parts.push(`<h2>${formatInline(escapeHtml(h2[1]))}</h2>`);
    } else if (h1) {
      parts.push(`<h1>${formatInline(escapeHtml(h1[1]))}</h1>`);
    } else if (li) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${formatInline(escapeHtml(li[1]))}</li>`);
    } else if (empty) {
      if (!inList) parts.push('<div class="md-spacer"></div>');
    } else {
      parts.push(`<p>${formatInline(escapeHtml(line))}</p>`);
    }
  }

  if (inList) parts.push('</ul>');

  return parts.join('');
}
