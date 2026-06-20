'use client';

import { useEffect, useRef } from 'react';
import type { RichSegment } from '@/lib/api-client';

// 본문 서식 에디터 — contentEditable + execCommand. 직렬화는 DOM 을 직접 순회해
// {평문, 세그먼트[]} 로 변환(임의 HTML 저장/렌더 없음 → XSS 안전). React 렌더는 텍스트만.

type SizeKey = 'sm' | 'normal' | 'lg' | 'xl';

const SIZE_TO_FONT_LEVEL: Record<SizeKey, string> = {
  sm: '2',
  normal: '3',
  lg: '5',
  xl: '6',
};

const COLOR_SWATCHES = ['#111827', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed'];

export type RichBodyValue = { plain: string; segments: RichSegment[] };

function rgbToHex(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const v = input.trim();
  if (v.startsWith('#')) {
    if (v.length === 7) return v.toLowerCase();
    if (v.length === 4) {
      const r = v.charAt(1);
      const g = v.charAt(2);
      const b = v.charAt(3);
      return ('#' + r + r + g + g + b + b).toLowerCase();
    }
    return undefined;
  }
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return undefined;
  const hex = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
  return ('#' + hex(m[1] ?? '0') + hex(m[2] ?? '0') + hex(m[3] ?? '0')).toLowerCase();
}

function bucketSize(raw: string | undefined): SizeKey | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'x-small' || v === 'small' || v === 'xx-small') return 'sm';
  if (v === 'medium') return undefined;
  if (v === 'large') return 'lg';
  if (v === 'x-large') return 'lg';
  if (v === 'xx-large' || v === 'xxx-large') return 'xl';
  const px = parseFloat(v);
  if (!Number.isNaN(px) && v.endsWith('px')) {
    if (px <= 13) return 'sm';
    if (px <= 17) return undefined;
    if (px <= 24) return 'lg';
    return 'xl';
  }
  return undefined;
}

function bucketFontTag(n: number): SizeKey | undefined {
  if (n <= 2) return 'sm';
  if (n === 3) return undefined;
  if (n <= 5) return 'lg';
  return 'xl';
}

type State = { b?: boolean; i?: boolean; u?: boolean; c?: string; s?: SizeKey };

export function serializeEditor(root: HTMLElement): RichBodyValue {
  const raw: Array<{ t: string } & State> = [];
  let plain = '';

  function pushNewline() {
    if (plain.length > 0 && !plain.endsWith('\n')) {
      raw.push({ t: '\n' });
      plain += '\n';
    }
  }

  function walk(node: Node, st: State) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent ?? '';
        if (t) {
          raw.push({ t, ...st });
          plain += t;
        }
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') {
        raw.push({ t: '\n' });
        plain += '\n';
        return;
      }
      const isBlock = tag === 'div' || tag === 'p';
      if (isBlock) pushNewline();

      const ns: State = { ...st };
      if (tag === 'b' || tag === 'strong') ns.b = true;
      if (tag === 'i' || tag === 'em') ns.i = true;
      if (tag === 'u') ns.u = true;
      const style = el.style;
      if (style) {
        const fw = style.fontWeight;
        if (fw === 'bold' || fw === 'bolder' || (parseInt(fw, 10) || 0) >= 600) ns.b = true;
        if (style.fontStyle === 'italic') ns.i = true;
        const td = `${style.textDecoration} ${style.textDecorationLine}`;
        if (td.includes('underline')) ns.u = true;
        const col = rgbToHex(style.color);
        if (col) ns.c = col;
        const sz = bucketSize(style.fontSize);
        if (sz) ns.s = sz;
      }
      if (tag === 'font') {
        const cattr = el.getAttribute('color');
        if (cattr) {
          const hx = rgbToHex(cattr);
          if (hx) ns.c = hx;
        }
        const sattr = el.getAttribute('size');
        if (sattr) {
          const sz = bucketFontTag(parseInt(sattr, 10));
          if (sz) ns.s = sz;
        }
      }
      walk(el, ns);
    });
  }

  walk(root, {});

  // 정규화 + 인접 동일 서식 병합.
  const segments: RichSegment[] = [];
  for (const r of raw) {
    const seg: RichSegment = { t: r.t };
    if (r.b) seg.b = true;
    if (r.i) seg.i = true;
    if (r.u) seg.u = true;
    if (r.c) seg.c = r.c;
    if (r.s && r.s !== 'normal') seg.s = r.s;
    const prev = segments[segments.length - 1];
    if (
      prev &&
      !!prev.b === !!seg.b &&
      !!prev.i === !!seg.i &&
      !!prev.u === !!seg.u &&
      prev.c === seg.c &&
      prev.s === seg.s
    ) {
      prev.t += seg.t;
    } else {
      segments.push(seg);
    }
  }

  return { plain: plain.replace(/\n{3,}/g, '\n\n').trim(), segments };
}

export function RichBodyEditor({
  onChange,
  placeholder,
  labels,
}: {
  onChange: (value: RichBodyValue) => void;
  placeholder: string;
  labels: {
    sizeTitle: string;
    sizeSubtitle: string;
    sizeBody: string;
    sizeSmall: string;
    bold: string;
    italic: string;
    underline: string;
    color: string;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* noop */
    }
  }, []);

  function emit() {
    if (ref.current) onChange(serializeEditor(ref.current));
  }

  function exec(command: string, value?: string) {
    ref.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      /* noop */
    }
    emit();
  }

  function applySize(key: SizeKey) {
    exec('fontSize', SIZE_TO_FONT_LEVEL[key]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-t-2xl border border-b-0 border-stone-200 bg-stone-50 px-2 py-1.5 dark:border-stone-800 dark:bg-stone-800/40">
        <ToolbarButton onClick={() => applySize('xl')} label={labels.sizeTitle} className="text-[15px] font-bold" />
        <ToolbarButton onClick={() => applySize('lg')} label={labels.sizeSubtitle} className="text-[13px] font-bold" />
        <ToolbarButton onClick={() => applySize('normal')} label={labels.sizeBody} className="text-[12px]" />
        <ToolbarButton onClick={() => applySize('sm')} label={labels.sizeSmall} className="text-[10px]" />
        <span className="mx-0.5 h-5 w-px bg-stone-300 dark:bg-stone-700" />
        <ToolbarButton onClick={() => exec('bold')} label={labels.bold} className="font-bold" />
        <ToolbarButton onClick={() => exec('italic')} label={labels.italic} className="italic" />
        <ToolbarButton onClick={() => exec('underline')} label={labels.underline} className="underline" />
        <span className="mx-0.5 h-5 w-px bg-stone-300 dark:bg-stone-700" />
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${labels.color} ${c}`}
            onClick={() => exec('foreColor', c)}
            className="h-5 w-5 rounded-full border border-stone-300 dark:border-stone-600"
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="ml-0.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-stone-300 dark:border-stone-600">
          <input
            type="color"
            aria-label={labels.color}
            onChange={(e) => exec('foreColor', e.target.value)}
            className="h-7 w-7 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        className="rich-editor min-h-[140px] w-full rounded-b-2xl border border-stone-200 bg-white px-4 py-3 text-base leading-relaxed text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-stone-700 transition hover:bg-stone-200 active:scale-95 dark:text-stone-200 dark:hover:bg-stone-700 ${className ?? ''}`}
    >
      {label}
    </button>
  );
}

// 안전 렌더 — 세그먼트를 styled span 으로(React 가 텍스트 이스케이프). 임의 HTML 미사용.
export function richSegmentStyle(s: RichSegment): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (s.b) style.fontWeight = 700;
  if (s.i) style.fontStyle = 'italic';
  if (s.u) style.textDecoration = 'underline';
  if (s.c) style.color = s.c;
  if (s.s === 'sm') style.fontSize = '0.85em';
  else if (s.s === 'lg') style.fontSize = '1.3em';
  else if (s.s === 'xl') style.fontSize = '1.7em';
  return style;
}

export function RichBodyView({
  segments,
  fallback,
  className,
}: {
  segments: RichSegment[] | null | undefined;
  fallback: string;
  className?: string;
}) {
  if (!segments || segments.length === 0) {
    return <p className={className}>{fallback}</p>;
  }
  return (
    <p className={className}>
      {segments.map((s, i) => (
        <span key={i} style={richSegmentStyle(s)}>
          {s.t}
        </span>
      ))}
    </p>
  );
}
