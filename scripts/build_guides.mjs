import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const guidesDir = path.join(projectRoot, 'guides');
const manifestPath = path.join(projectRoot, 'guides_manifest.json');
const PLACEHOLDER = '::GUIDE::';

function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(text) {
  return text.replace(/[&<>]/g, ch => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    return '&gt;';
  });
}

function escapeAttribute(text) {
  return text.replace(/[&<>"']/g, ch => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function sanitizeLinkHref(href) {
  const trimmed = href.trim();
  if (!trimmed) return '#';
  if (/^(?:https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('guides/')) return trimmed;
  return '#';
}

function buildGuideUrl(slug, target) {
  const cleaned = (target || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const segments = cleaned.split('/').filter(Boolean);
  const all = ['guides', slug, ...segments];
  return all.map(seg => encodeURIComponent(seg)).join('/');
}

function normalizeImagePath(src, slug) {
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(PLACEHOLDER)) {
    const payload = trimmed.slice(PLACEHOLDER.length);
    const parts = payload.split('::');
    const guideSlug = parts.shift() || slug;
    const pathPart = parts.join('::');
    return buildGuideUrl(guideSlug, pathPart);
  }
  if (/^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const rel = trimmed.slice(1);
    const segs = rel.split('/').filter(Boolean);
    return ['guides', ...segs].map(seg => encodeURIComponent(seg)).join('/');
  }
  if (trimmed.startsWith('guides/')) {
    const rel = trimmed.slice('guides/'.length);
    const segs = rel.split('/').filter(Boolean);
    return ['guides', ...segs].map(seg => encodeURIComponent(seg)).join('/');
  }
  const cleaned = trimmed.replace(/^\.\//, '').replace(/\\/g, '/');
  const segs = cleaned.split('/').filter(Boolean);
  return ['guides', slug, ...segs].map(seg => encodeURIComponent(seg)).join('/');
}

function preprocessMarkdown(markdown, slug) {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/!\[\[(.+?)\]\]/g, (_match, inner) => {
      const parts = inner.split('|');
      const target = (parts.shift() || '').trim();
      const alias = parts.join('|').trim();
      const alt = alias || target;
      const placeholder = `${PLACEHOLDER}${slug}::${target}`;
      return `![${alt}](${placeholder})`;
    });
}

function cleanTitle(rawTitle) {
  return rawTitle
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1')
    .replace(/[\*`_~]/g, '')
    .trim();
}

function parseInline(text, slug) {
  if (!text) return '';
  const pattern = /(!?\[[^\]]*?\]\([^\)]+\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let html = '';
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) html += escapeHtml(before);
    const token = match[0];
    if (token.startsWith('![')) {
      const imageMatch = token.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
      if (imageMatch) {
        const alt = escapeAttribute(imageMatch[1]);
        const src = escapeAttribute(normalizeImagePath(imageMatch[2], slug));
        html += `<img src="${src}" alt="${alt}" loading="lazy" />`;
      } else {
        html += escapeHtml(token);
      }
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (linkMatch) {
        const inner = parseInline(linkMatch[1], slug);
        const href = escapeAttribute(sanitizeLinkHref(linkMatch[2]));
        const anchor = href.startsWith('#');
        const extra = anchor ? '' : ' target="_blank" rel="noopener"';
        html += `<a href="${href}"${extra}>${inner}</a>`;
      } else {
        html += escapeHtml(token);
      }
    } else if (token.startsWith('**')) {
      html += `<strong>${parseInline(token.slice(2, -2), slug)}</strong>`;
    } else if (token.startsWith('*')) {
      html += `<em>${parseInline(token.slice(1, -1), slug)}</em>`;
    } else if (token.startsWith('`')) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
    }
    lastIndex = pattern.lastIndex;
  }
  const rest = text.slice(lastIndex);
  if (rest) html += escapeHtml(rest);
  return html;
}

function renderMarkdown(markdown, slug) {
  const lines = markdown.split('\n');
  const output = [];
  let paragraphLines = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    output.push(`<p>${paragraphLines.join(' ')}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  const startList = type => {
    if (listType !== type) {
      flushParagraph();
      flushList();
      output.push(`<${type}>`);
      listType = type;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      const content = parseInline(headingMatch[2].trim(), slug);
      output.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      output.push('<hr />');
      continue;
    }

    const ulMatch = rawLine.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      startList('ul');
      output.push(`<li>${parseInline(ulMatch[1].trim(), slug)}</li>`);
      continue;
    }

    const olMatch = rawLine.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      startList('ol');
      output.push(`<li>${parseInline(olMatch[1].trim(), slug)}</li>`);
      continue;
    }

    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      flushParagraph();
      flushList();
      output.push(trimmed);
      continue;
    }

    if (listType) {
      flushList();
    }
    paragraphLines.push(parseInline(trimmed, slug));
  }

  flushParagraph();
  flushList();
  return output.join('\n');
}

async function loadGuides() {
  let entries = [];
  try {
    entries = await fs.readdir(guidesDir, { withFileTypes: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const guides = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const slug = entry.name;
    const bodyPath = path.join(guidesDir, slug, 'body.md');
    try {
      await fs.access(bodyPath);
    } catch {
      continue;
    }
    const raw = await fs.readFile(bodyPath, 'utf8');
    const titleMatch = raw.match(/^#\s+(.+)/m);
    const title = cleanTitle(titleMatch ? titleMatch[1] : '') || slugToTitle(slug);
    const processed = preprocessMarkdown(raw, slug);
    const html = renderMarkdown(processed, slug);
    guides.push({ slug, title, html });
  }
  guides.sort((a, b) => a.title.localeCompare(b.title));
  const manifest = {
    generatedAt: new Date().toISOString(),
    guides
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Wrote ${guides.length} guide${guides.length === 1 ? '' : 's'} to guides_manifest.json`);
}

loadGuides().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
