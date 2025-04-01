const fs = require('fs');
const path = require('path');


function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


function extractCodeBlocks(md) {
    const codeBlocks = [];

    // 1 Тройные бэктики
    md = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (match, code) => {
        codeBlocks.push(code);
        return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
    });

    // 2 Тройные одинарные кавычки
    md = md.replace(/'''[^\n]*\n([\s\S]*?)'''/g, (match, code) => {
        codeBlocks.push(code);
        return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
    });

    return {md, codeBlocks};
}


function restoreCodeBlocks(md, codeBlocks) {
    codeBlocks.forEach((code, index) => {
        const placeholder = `@@CODEBLOCK${index}@@`;
        md = md.replace(
            placeholder,
            `<pre><code>${escapeHtml(code)}</code></pre>`
        );
    });
    return md;
}


function protectLaTeX(md) {
    const placeholders = [];

    // Блоковые формулы
    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
        placeholders.push(match);
        return `@@LATEXBLOCK${placeholders.length - 1}@@`;
    });

    // Инлайн-формулы
    md = md.replace(/\$([\s\S]+?)\$/g, (match) => {
        placeholders.push(match);
        return `@@LATEXINLINE${placeholders.length - 1}@@`;
    });

    return {md, placeholders};
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

/**
 * Обработка заголовков (#, ##, ### и т.д.)
 */
function processHeadings(md) {
    md = md.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
    md = md.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
    md = md.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    md = md.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    return md;
}

/**
 * Обработка цитат: строки, начинающиеся с "> ".
 */
function processBlockquotes(md) {
    return md.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
}

/**
 * Горизонтальные линии (---, ***, ___)
 */
function processHorizontalRules(md) {
    md = md.replace(/^(?:\*\s*){3,}$/gm, '<hr />');
    md = md.replace(/^(?:-\s*){3,}$/gm, '<hr />');
    md = md.replace(/^(?:_\s*){3,}$/gm, '<hr />');
    return md;
}

/**
 * Обработка списков:
 *  - Ненумерованные: -, +, *
 *  - Нумерованные: 1., 2., 3.
 * Для нумерованных списков ставим <li value="N">, чтобы нумерация шла корректно.
 */
function processLists(md) {
    const lines = md.split('\n');
    let result = '';
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Ненумерованные списки
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
        }
        // Нумерованные списки
        else if (/^\s*(\d+)\.\s+/.test(line)) {
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

/**
 * Обработка встроенных элементов: изображения, ссылки, жирный/курсив, инлайн-код.
 */
function processInline(md) {
    // Изображения
    md = md.replace(
        /!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)/g,
        (match, alt, src, title) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${src}" alt="${alt}"${titleAttr} />`;
        }
    );

    // Ссылки
    md = md.replace(
        /\[([^\]]+)\]\((\S+)(?:\s+"([^"]+)")?\)/g,
        (match, text, url, title) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${url}"${titleAttr}>${text}</a>`;
        }
    );

    // Жирный текст
    md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Курсив
    md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
    md = md.replace(/_(.*?)_/g, '<em>$1</em>');

    // Инлайн-код (одинарные бэктики)
    md = md.replace(/`([^`]+?)`/g, '<code>$1</code>');

    return md;
}

function processParagraphs(md) {
    return md
        .split(/\n\s*\n/)
        .map((block) => {
            if (/^\s*<(h[1-6]|ul|ol|li|pre|blockquote|hr|img|div|p|table)/i.test(block.trim())) {
                return block;
            }
            return `<p>${block.trim()}</p>`;
        })
        .join('\n\n');
}

function markdownToHtml(md) {
    const {md: withoutCode, codeBlocks} = extractCodeBlocks(md);
    const {md: protectedMd, placeholders: latexPlaceholders} = protectLaTeX(withoutCode);

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

function convertMarkdownFile(inputFilePath, outputFilePath) {
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла:', err);
            return;
        }
        const bodyContent = markdownToHtml(data);
        const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Converted Markdown</title>
  <link rel="stylesheet" href="style.css">
  <!-- MathJax -->
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$','$$'], ['\\\\[', '\\\\]']]
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
${bodyContent}
</body>
</html>
    `;
        fs.writeFile(outputFilePath, htmlContent, (err) => {
            if (err) {
                console.error('Ошибка записи файла:', err);
            } else {
                console.log('Файл успешно создан:', outputFilePath);
            }
        });
    });
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Использование: node convert.js input.md [output.html]');
    process.exit(1);
}
const inputFile = args[0];
let outputFile = args[1];
if (!outputFile) {
    outputFile = inputFile.replace(/\.md$/i, '.html');
}

convertMarkdownFile(inputFile, outputFile);
