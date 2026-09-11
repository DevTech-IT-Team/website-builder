import { memo, useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import * as Lucide from 'lucide-react';
import { FileText } from 'lucide-react';
import { sanitizeHTML } from '@/utils/sanitize';
import type { CanvasElement, FormField } from '@/builder/types';
import { stylesToCss } from '@/builder/styles';

function youtubeEmbed(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function IconView({ name, size, color }: { name: string; size: number; color?: string }) {
  const Icon = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name] || Lucide.Sparkles;
  return <Icon size={size} color={color} />;
}

function FormView({ element, css }: { element: CanvasElement; css: CSSProperties }) {
  const fields = (element.content.fields as FormField[]) || [];
  return (
    <form style={css} onSubmit={(event) => event.preventDefault()}>
      {element.content.title ? (
        <p className="text-base font-semibold text-slate-900">{String(element.content.title)}</p>
      ) : null}
      {fields.map((field) => (
        <label key={field.id} className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            {field.label}
            {field.required ? <span className="text-rose-500"> *</span> : null}
          </span>
          {field.type === 'checkbox' || field.type === 'consent' ? (
            <span className="flex items-center gap-2 font-normal">
              <input type="checkbox" disabled className="rounded border-slate-300" />
              {field.placeholder || field.label}
            </span>
          ) : field.type === 'dropdown' || field.type === 'multiselect' ? (
            <select disabled className="h-10 rounded-lg border border-slate-200 bg-white px-3">
              {(field.options || ['Option 1']).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : field.type === 'radio' ? (
            <span className="flex flex-wrap gap-3">
              {(field.options || ['Yes', 'No']).map((option) => (
                <span key={option} className="flex items-center gap-1.5">
                  <input type="radio" disabled /> {option}
                </span>
              ))}
            </span>
          ) : field.type === 'file' ? (
            <input type="file" disabled className="text-xs" />
          ) : (
            <input
              disabled
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3"
            />
          )}
        </label>
      ))}
      <button type="button" className="mt-2 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
        {String(element.content.submitLabel || 'Submit')}
      </button>
    </form>
  );
}

function InlineTextEditor({
  html,
  tag,
  css,
  onSave,
  onCancel,
}: {
  html: string;
  tag: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  css: CSSProperties;
  onSave: (next: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const initialRef = useRef(html);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = sanitizeHTML(html);
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [html]);

  const commit = (value: string) => onSave(sanitizeHTML(value));

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && tag !== 'p') {
      event.preventDefault();
      commit(ref.current?.innerHTML || '');
    }
  };

  const Tag = tag;
  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      style={css}
      className="outline-none ring-1 ring-sky-400/70"
      onBlur={() => commit(ref.current?.innerHTML || initialRef.current)}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export const CanvasElementView = memo(function CanvasElementView({
  element,
  css,
  editing = false,
  onSaveText,
  onCancelEdit,
}: {
  element: CanvasElement;
  css: CSSProperties;
  editing?: boolean;
  onSaveText?: (html: string) => void;
  onCancelEdit?: () => void;
}) {
  switch (element.type) {
    case 'text': {
      const html = String(element.content.text || 'Edit this text');
      const Tag = (element.content.tag as 'p' | 'h1' | 'h2' | 'h3' | 'span') || 'p';
      if (editing && onSaveText && onCancelEdit) {
        return <InlineTextEditor html={html} tag={Tag} css={css} onSave={onSaveText} onCancel={onCancelEdit} />;
      }
      return <Tag style={css} dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }} />;
    }
    case 'image':
      return (
        <img
          src={String(element.content.src || '')}
          alt={String(element.content.alt || '')}
          draggable={false}
          loading="lazy"
          decoding="async"
          style={css}
          className="max-w-full"
        />
      );
    case 'button':
      return (
        <a
          href={String(element.content.href || '#')}
          target={String(element.content.target || '_self')}
          onClick={(event) => event.preventDefault()}
          style={css}
          className="inline-flex no-underline"
        >
          {String(element.content.label || 'Button')}
        </a>
      );
    case 'icon':
      return (
        <span style={css} className="inline-flex">
          <IconView
            name={String(element.content.icon || 'Sparkles')}
            size={Number(element.content.size || 28)}
            color={typeof css.color === 'string' ? css.color : undefined}
          />
        </span>
      );
    case 'video': {
      const url = String(element.content.url || '');
      const embed = youtubeEmbed(url);
      return (
        <div style={css} className="overflow-hidden bg-slate-900">
          {embed.includes('youtube.com') ? (
            <iframe
              src={embed}
              title="Video"
              className="h-full min-h-[220px] w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <video src={url} controls preload="metadata" className="h-full w-full" />
          )}
        </div>
      );
    }
    case 'divider':
      return <hr style={{ ...css, border: 'none' }} />;
    case 'form':
      return <FormView element={element} css={css} />;
    case 'pdf':
      return (
        <div style={css} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{String(element.content.title || 'PDF Resource')}</p>
            <p className="text-xs text-slate-500">{String(element.content.description || 'Add a PDF URL in properties')}</p>
          </div>
        </div>
      );
    default:
      return <div style={css}>{element.name}</div>;
  }
});
