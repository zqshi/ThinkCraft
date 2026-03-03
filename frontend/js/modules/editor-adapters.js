import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';

const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px'];
const HEADING_OPTIONS = [
  { label: '段落', value: '0' },
  { label: 'H1', value: '1' },
  { label: 'H2', value: '2' },
  { label: 'H3', value: '3' }
];
const FONT_FAMILIES = [
  { label: '默认', value: '' },
  { label: 'PingFang SC', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
];
const detectByFileName = fileName => {
  const value = String(fileName || '').toLowerCase();
  if (!value.includes('.')) {
    return '';
  }
  if (value.endsWith('.ts') || value.endsWith('.tsx')) {
    return 'typescript';
  }
  if (value.endsWith('.js') || value.endsWith('.jsx') || value.endsWith('.mjs')) {
    return 'javascript';
  }
  if (value.endsWith('.json')) {
    return 'json';
  }
  if (value.endsWith('.html') || value.endsWith('.htm')) {
    return 'html';
  }
  if (value.endsWith('.css') || value.endsWith('.scss') || value.endsWith('.less')) {
    return 'css';
  }
  if (value.endsWith('.py')) {
    return 'python';
  }
  if (value.endsWith('.sql')) {
    return 'sql';
  }
  if (value.endsWith('.md') || value.endsWith('.markdown')) {
    return 'markdown';
  }
  if (value.endsWith('.yml') || value.endsWith('.yaml')) {
    return 'yaml';
  }
  if (value.endsWith('.xml')) {
    return 'xml';
  }
  return '';
};

const detectByContent = value => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  const head = text.slice(0, 4000);

  if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(head)) {
    try {
      JSON.parse(head);
      return 'json';
    } catch (_error) {
      // not strict json
    }
  }

  if (/<(!doctype\s+html|html|head|body|div|span|script|style)\b/i.test(head)) {
    return 'html';
  }
  if (
    /^\s*SELECT\b|^\s*INSERT\b|^\s*UPDATE\b|^\s*DELETE\b|^\s*CREATE\s+(TABLE|INDEX|VIEW)\b/im.test(
      head
    )
  ) {
    return 'sql';
  }
  if (/^\s*(def |class |import |from [\w.]+ import |if __name__ == ['"]__main__['"])/m.test(head)) {
    return 'python';
  }
  if (/^\s*[@\w-]+\s*:\s*.+$/m.test(head) && !/[{};]/.test(head)) {
    return 'yaml';
  }
  if (/[.#][\w-]+\s*\{[\s\S]*:\s*[^;]+;[\s\S]*\}/m.test(head)) {
    return 'css';
  }
  if (/\b(interface|type|enum)\b|\bimplements\b|:\s*[A-Z](?:[\w<>]|\[|\]|\||,|&| )+\b/.test(head)) {
    return 'typescript';
  }
  if (/\b(function|const|let|var|=>|module\.exports|require\()/m.test(head)) {
    return 'javascript';
  }
  return '';
};

const decodeCommonEntities = value => {
  return String(value || '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
};

const decodeLegacyEscapedNewlines = value => {
  const text = String(value || '');
  if (!text) {
    return '';
  }
  // Only decode legacy literal escapes when there are no real line breaks.
  if (!text.includes('\n') && (text.includes('\\n') || text.includes('\\r\\n'))) {
    return text.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n').replaceAll('\\t', '\t');
  }
  return text.replaceAll('\r\n', '\n');
};

const looksLikeHtml = value => {
  return /<(p|h[1-6]|div|section|article|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|img|br|strong|em|span|a|pre|code)\b/i.test(
    value
  );
};

const looksLikeMarkdown = value => {
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)/m.test(
    value
  );
};

const escapeHtml = value => {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};

const renderMarkdownToHtml = value => {
  const host = typeof window !== 'undefined' ? window : globalThis;
  if (host.markdownRenderer?.render) {
    return host.markdownRenderer.render(value);
  }
  if (host.marked?.parse) {
    return host.marked.parse(value);
  }
  return `<p>${escapeHtml(value).replaceAll('\n', '<br>')}</p>`;
};

const toCssEntries = style => {
  return String(style || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const idx = entry.indexOf(':');
      if (idx <= 0) {
        return acc;
      }
      const key = entry.slice(0, idx).trim().toLowerCase();
      const value = entry.slice(idx + 1).trim();
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
};

const toCssText = entries => {
  return Object.entries(entries)
    .filter(([, value]) => Boolean(String(value || '').trim()))
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
};

const buildTextStyleAttr = HTMLAttributes => {
  const merged = toCssEntries(HTMLAttributes?.style || '');
  if (HTMLAttributes.fontSize) {
    merged['font-size'] = HTMLAttributes.fontSize;
  } else {
    delete merged['font-size'];
  }
  if (HTMLAttributes.fontFamily) {
    merged['font-family'] = HTMLAttributes.fontFamily;
  } else {
    delete merged['font-family'];
  }
  if (HTMLAttributes.textColor) {
    merged.color = HTMLAttributes.textColor;
  } else {
    delete merged.color;
  }
  if (HTMLAttributes.textBackground) {
    merged['background-color'] = HTMLAttributes.textBackground;
  } else {
    delete merged['background-color'];
  }
  const style = toCssText(merged);
  return style ? { style } : {};
};

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle']
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: HTMLAttributes => buildTextStyleAttr(HTMLAttributes)
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setFontSize:
        fontSize =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).run()
    };
  }
});

const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() {
    return {
      types: ['textStyle']
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily || null,
            renderHTML: HTMLAttributes => buildTextStyleAttr(HTMLAttributes)
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        fontFamily =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontFamily }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontFamily: null }).run()
    };
  }
});

const TextColor = Extension.create({
  name: 'textColor',
  addOptions() {
    return {
      types: ['textStyle']
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textColor: {
            default: null,
            parseHTML: element => element.style.color || null,
            renderHTML: HTMLAttributes => buildTextStyleAttr(HTMLAttributes)
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setTextColor:
        textColor =>
        ({ chain }) =>
          chain().setMark('textStyle', { textColor }).run(),
      unsetTextColor:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { textColor: null }).run()
    };
  }
});

const TextBackground = Extension.create({
  name: 'textBackground',
  addOptions() {
    return {
      types: ['textStyle']
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textBackground: {
            default: null,
            parseHTML: element => element.style.backgroundColor || null,
            renderHTML: HTMLAttributes => buildTextStyleAttr(HTMLAttributes)
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setTextBackground:
        textBackground =>
        ({ chain }) =>
          chain().setMark('textStyle', { textBackground }).run(),
      unsetTextBackground:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { textBackground: null }).run()
    };
  }
});

const toHtmlContent = value => {
  const text = String(value || '');
  const trimmed = text.trim();
  if (!trimmed) {
    return '<p></p>';
  }
  const decoded = decodeCommonEntities(trimmed);
  if (looksLikeHtml(decoded)) {
    return decoded;
  }
  if (looksLikeMarkdown(decoded)) {
    return renderMarkdownToHtml(decoded);
  }
  return `<p>${escapeHtml(decoded).replaceAll('\n', '<br>')}</p>`;
};

const normalizeMarkdownOutput = value => {
  const text = String(value || '')
    .replaceAll('\r\n', '\n')
    // Keep at most one escaping slash first, then strip markdown escapes for our custom renderer.
    .replace(/\\{2,}(?=\\|`|\*|_|{|}|\[|\]|\(|\)|#|\+|-|\.|!|\||>)/g, '\\');

  const lines = text.split('\n');
  let inFence = false;
  const normalized = lines.map(line => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) {
      return line;
    }
    return line.replace(/\\(#|>|\*|_|-|\[|\]|\(|\)|\||`)/g, '$1').replace(/(\d+)\\\./g, '$1.');
  });
  return normalized.join('\n').trim();
};

const createMarkdownExporter = () => {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**'
  });
  service.use(gfm);
  return html => {
    const raw = String(html || '').trim();
    if (!raw || raw === '<p></p>' || raw === '<p><br></p>') {
      return '';
    }
    return normalizeMarkdownOutput(service.turndown(raw));
  };
};

const createToolbarButton = (label, title, onClick) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'artifact-editor-toolbar-btn';
  button.title = title;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const createToolbarSelect = (options, title, onChange) => {
  const select = document.createElement('select');
  select.className = 'artifact-editor-toolbar-select';
  select.title = title;
  options.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  });
  select.addEventListener('change', () => onChange(select.value));
  return select;
};

const buildTiptapToolbar = (toolbarMount, editor) => {
  toolbarMount.innerHTML = '';

  const group0 = document.createElement('div');
  group0.className = 'artifact-editor-toolbar-group';
  group0.appendChild(createToolbarButton('↶', '撤销', () => editor.chain().focus().undo().run()));
  group0.appendChild(createToolbarButton('↷', '重做', () => editor.chain().focus().redo().run()));
  group0.appendChild(
    createToolbarSelect(HEADING_OPTIONS, '标题级别', value => {
      const level = Number(value || 0);
      if (!level) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor.chain().focus().toggleHeading({ level }).run();
      }
    })
  );

  const group1 = document.createElement('div');
  group1.className = 'artifact-editor-toolbar-group';
  group1.appendChild(
    createToolbarButton('B', '加粗', () => editor.chain().focus().toggleBold().run())
  );
  group1.appendChild(
    createToolbarButton('I', '斜体', () => editor.chain().focus().toggleItalic().run())
  );
  group1.appendChild(
    createToolbarButton('U', '下划线', () => editor.chain().focus().toggleUnderline().run())
  );

  const group2 = document.createElement('div');
  group2.className = 'artifact-editor-toolbar-group';
  group2.appendChild(
    createToolbarSelect(FONT_FAMILIES, '字体', value =>
      value
        ? editor.chain().focus().setFontFamily(value).run()
        : editor.chain().focus().unsetFontFamily().run()
    )
  );
  group2.appendChild(
    createToolbarSelect(
      [{ label: '字号', value: '' }, ...FONT_SIZES.map(size => ({ label: size, value: size }))],
      '字号',
      value =>
        value
          ? editor.chain().focus().setFontSize(value).run()
          : editor.chain().focus().unsetFontSize().run()
    )
  );

  const group3 = document.createElement('div');
  group3.className = 'artifact-editor-toolbar-group';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'artifact-editor-toolbar-color';
  colorInput.title = '文字颜色';
  colorInput.addEventListener('input', () =>
    editor.chain().focus().setTextColor(colorInput.value).run()
  );
  group3.appendChild(colorInput);
  const bgInput = document.createElement('input');
  bgInput.type = 'color';
  bgInput.className = 'artifact-editor-toolbar-color';
  bgInput.title = '文字高亮';
  bgInput.value = '#fff59d';
  bgInput.addEventListener('input', () =>
    editor.chain().focus().setTextBackground(bgInput.value).run()
  );
  group3.appendChild(bgInput);

  const group4 = document.createElement('div');
  group4.className = 'artifact-editor-toolbar-group';
  group4.appendChild(
    createToolbarButton('左', '左对齐', () => editor.chain().focus().setTextAlign('left').run())
  );
  group4.appendChild(
    createToolbarButton('中', '居中', () => editor.chain().focus().setTextAlign('center').run())
  );
  group4.appendChild(
    createToolbarButton('右', '右对齐', () => editor.chain().focus().setTextAlign('right').run())
  );

  const group5 = document.createElement('div');
  group5.className = 'artifact-editor-toolbar-group';
  group5.appendChild(
    createToolbarButton('• 列表', '无序列表', () => editor.chain().focus().toggleBulletList().run())
  );
  group5.appendChild(
    createToolbarButton('1. 列表', '有序列表', () =>
      editor.chain().focus().toggleOrderedList().run()
    )
  );
  group5.appendChild(
    createToolbarButton('“', '引用块', () => editor.chain().focus().toggleBlockquote().run())
  );

  const group6 = document.createElement('div');
  group6.className = 'artifact-editor-toolbar-group';
  group6.appendChild(
    createToolbarButton('Link', '插入链接', () => {
      const existing = editor.getAttributes('link').href || '';
      const href = window.prompt('请输入链接 URL', existing || 'https://');
      if (href === null) {
        return;
      }
      const value = href.trim();
      if (!value) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
    })
  );
  group6.appendChild(
    createToolbarButton('Img', '插入图片(URL)', () => {
      const src = window.prompt('请输入图片 URL');
      if (!src) {
        return;
      }
      editor.chain().focus().setImage({ src: src.trim() }).run();
    })
  );
  group6.appendChild(
    createToolbarButton('Tx', '清除格式', () => {
      editor.chain().focus().unsetAllMarks().clearNodes().run();
    })
  );

  toolbarMount.append(group0, group1, group2, group3, group4, group5, group6);
};

const createTiptap = ({ mount, toolbar, content }) => {
  const toMarkdown = createMarkdownExporter();
  const editor = new Editor({
    element: mount,
    content: toHtmlContent(decodeLegacyEscapedNewlines(content)),
    extensions: [
      StarterKit,
      TextStyle,
      Underline,
      FontSize,
      FontFamily,
      TextColor,
      TextBackground,
      Link.configure({
        openOnClick: false,
        autolink: true
      }),
      Image.configure({
        inline: false,
        allowBase64: true
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ]
  });

  buildTiptapToolbar(toolbar, editor);

  return {
    type: 'tiptap',
    getContent() {
      return toMarkdown(editor.getHTML());
    },
    destroy() {
      try {
        editor.destroy();
      } catch (_error) {
        // noop
      }
      if (toolbar) {
        toolbar.innerHTML = '';
      }
    }
  };
};

const resolveCodeLanguage = ({ hint, type, fileName, content }) => {
  const byFileName = detectByFileName(fileName);
  const byContent = detectByContent(content);
  const normalized = `${byFileName} ${byContent} ${String(hint || '')} ${String(type || '')}`
    .trim()
    .toLowerCase();
  if (
    normalized.includes('typescript') ||
    normalized.includes('tsx') ||
    normalized.includes('ts ')
  ) {
    return javascript({
      typescript: true,
      jsx: normalized.includes('tsx') || normalized.includes('jsx')
    });
  }
  if (
    normalized.includes('javascript') ||
    normalized.includes('node') ||
    normalized.includes('js') ||
    normalized.includes('frontend-code') ||
    normalized.includes('backend-code')
  ) {
    return javascript({ jsx: normalized.includes('jsx') });
  }
  if (normalized.includes('json') || normalized.includes('env-config')) {
    return json();
  }
  if (normalized.includes('html') || normalized.includes('xml')) {
    return html();
  }
  if (normalized.includes('css') || normalized.includes('scss') || normalized.includes('less')) {
    return css();
  }
  if (normalized.includes('python') || normalized.includes('py')) {
    return python();
  }
  if (normalized.includes('sql') || normalized.includes('query')) {
    return sql();
  }
  return markdown();
};

const createCodeMirror = ({ mount, content, language, type, fileName }) => {
  const state = EditorState.create({
    doc: String(content || ''),
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      resolveCodeLanguage({ hint: language, type, fileName, content })
    ]
  });

  const view = new EditorView({
    state,
    parent: mount
  });

  return {
    type: 'codemirror',
    getContent() {
      return view.state.doc.toString();
    },
    destroy() {
      try {
        view.destroy();
      } catch (_error) {
        // noop
      }
    }
  };
};

const hostGlobal = typeof window !== 'undefined' ? window : globalThis;

hostGlobal.EditorAdapters = {
  createTiptap,
  createCodeMirror
};
