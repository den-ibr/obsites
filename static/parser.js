function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function extractCodeBlocks(md) {
    const codeBlocks = [];

    md = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (match, code) => {
        codeBlocks.push(code);
        return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
    });

    md = md.replace(/'''[^\n]*\n([\s\S]*?)'''/g, (match, code) => {
        codeBlocks.push(code);
        return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
    });

    return { md, codeBlocks };
}

function restoreCodeBlocks(md, codeBlocks) {
    codeBlocks.forEach((code, index) => {
        const placeholder = `@@CODEBLOCK${index}@@`;
        const escaped = escapeHtml(code);
        md = md.replace(
            placeholder,
            `<pre><code>${escaped}</code></pre>`
        );
    });
    return md;
}


function protectLaTeX(md) {
    const placeholders = [];

    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
        placeholders.push(match);
        return `@@LATEXBLOCK${placeholders.length - 1}@@`;
    });

    md = md.replace(/\$([\s\S]+?)\$/g, (match) => {
        placeholders.push(match);
        return `@@LATEXINLINE${placeholders.length - 1}@@`;
    });

    return { md, placeholders };
}

function restoreLaTeX(md, placeholders) {
    placeholders.forEach((latex, index) => {
        const blockKey = `@@LATEXBLOCK${index}@@`;
        const inlineKey = `@@LATEXINLINE${index}@@`;
        if (md.includes(blockKey)) {
            md = md.replace(blockKey, latex);
        } else {
            md = md.replace(inlineKey, latex);
        }
    });
    return md;
}

function processHeadings(md) {
    md = md.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
    md = md.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
    md = md.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    md = md.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    return md;
}

function processBlockquotes(md) {
    return md.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
}

function processHorizontalRules(md) {
    md = md.replace(/^(?:\*\s*){3,}$/gm, '<hr />');
    md = md.replace(/^(?:-\s*){3,}$/gm, '<hr />');
    md = md.replace(/^(?:_\s*){3,}$/gm, '<hr />');
    return md;
}

function processLists(md) {
    const lines = md.split('\n');
    let result = '';
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (/^\s*([-+*])\s+/.test(line)) {
            if (!inUl) {
                if (inOl) {
                    result += '</ol>\n';
                    inOl = false;
                }
                inUl = true;
                result += '<ul>\n';
            }
            line = line.replace(/^\s*([-+*])\s+/, '');
            result += '<li>' + line + '</li>\n';
        } else if (/^\s*(\d+)\.\s+/.test(line)) {
            if (!inOl) {
                if (inUl) {
                    result += '</ul>\n';
                    inUl = false;
                }
                inOl = true;
                result += '<ol>\n';
            }
            const match = line.match(/^\s*(\d+)\.\s+/);
            const num = match[1];
            const itemText = line.replace(/^\s*\d+\.\s+/, '');
            result += `<li value="${num}">${itemText}</li>\n`;
        } else {
            if (inUl) {
                result += '</ul>\n';
                inUl = false;
            }
            if (inOl) {
                result += '</ol>\n';
                inOl = false;
            }
            result += line + '\n';
        }
    }

    if (inUl) result += '</ul>\n';
    if (inOl) result += '</ol>\n';

    return result;
}

function processInline(md) {
    md = md.replace(
        /!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)/g,
        (match, alt, src, title) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${src}" alt="${alt}"${titleAttr} />`;
        }
    );

    md = md.replace(
        /\[([^\]]+)\]\((\S+)(?:\s+"([^"]+)")?\)/g,
        (match, text, url, title) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${url}"${titleAttr}>${text}</a>`;
        }
    );

    md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/__(.*?)__/g, '<strong>$1</strong>');

    md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
    md = md.replace(/_(.*?)_/g, '<em>$1</em>');

    md = md.replace(/`([^`]+?)`/g, '<code class="inline">$1</code>');

    return md;
}

function processParagraphs(md) {
    const lines = md.split('\n');
    const result = [];

    for (let line of lines) {
        const trimmed = line.trim();

        if (!trimmed) continue;

        const isBlock = /^<(h[1-6]|ul|ol|li|pre|blockquote|hr|img|div|p|table)/i.test(trimmed);
        const isLatex = /^@@LATEXBLOCK\d+@@$/.test(trimmed);

        if (isBlock || isLatex) {
            result.push(trimmed);
        } else {
            result.push(`<p>${trimmed}</p>`);
        }
    }

    return result.join('\n');
}

function markdownToHtmlBody(md) {
    const { md: withoutCode, codeBlocks } = extractCodeBlocks(md);
    const { md: protectedMd, placeholders: latexPlaceholders } = protectLaTeX(withoutCode);

    let processed = protectedMd;
    processed = processHeadings(processed);
    processed = processBlockquotes(processed);
    processed = processHorizontalRules(processed);
    processed = processLists(processed);
    processed = processInline(processed);
    processed = processParagraphs(processed);

    processed = restoreLaTeX(processed, latexPlaceholders);
    processed = restoreCodeBlocks(processed, codeBlocks);

    return processed;
}
