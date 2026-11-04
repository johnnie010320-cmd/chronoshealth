'use client';

// 개인정보처리방침/약관 텍스트를 간단한 마크다운 규칙으로 렌더.
//   `# 제목`  → h2,  `## 소제목` → h3,  `- 항목` → 목록,  빈 줄 → 문단 구분

import { BusinessFooter } from '@/components/BusinessFooter';

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string };

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushList();
      flushPara();
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushPara();
      blocks.push({ type: 'h3', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      flushPara();
      blocks.push({ type: 'h2', text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith('- ')) {
      flushPara();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushList();
  flushPara();
  return blocks;
}

export function LegalArticle({ markdown }: { markdown: string }) {
  const blocks = parse(markdown);
  return (
    <div className="space-y-4 text-[14px] leading-relaxed text-stone-700 dark:text-stone-300">
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return (
            <h2
              key={i}
              className="pt-4 text-[16px] font-bold text-stone-900 dark:text-stone-100"
            >
              {b.text}
            </h2>
          );
        }
        if (b.type === 'h3') {
          return (
            <h3
              key={i}
              className="pt-1 text-[14px] font-semibold text-stone-800 dark:text-stone-200"
            >
              {b.text}
            </h3>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

// 페이지 공통 셸(공개 · 비로그인 접근 가능).
export function LegalPage({
  title,
  effective,
  markdown,
}: {
  title: string;
  effective: string;
  markdown: string;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-10">
      <a
        href="/"
        className="text-[13px] font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        ← VITAcode
      </a>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h1>
      <p className="mt-1 text-[12px] text-stone-500 dark:text-stone-400">시행일: {effective}</p>
      <div className="mt-6">
        <LegalArticle markdown={markdown} />
      </div>
      <footer className="mt-12 border-t border-stone-200 pt-4 dark:border-stone-800">
        <BusinessFooter className="space-y-0.5 text-left text-[12px] leading-relaxed text-stone-500 dark:text-stone-400" />
      </footer>
    </main>
  );
}
