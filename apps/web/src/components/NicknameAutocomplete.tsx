'use client';

import { useEffect, useRef, useState } from 'react';
import { searchMembers } from '@/lib/api-client';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick?: (nickname: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  // 제안 목록에서 숨길 닉네임(이미 선택된 것 등).
  exclude?: string[];
};

// 기존 회원 닉네임 자동검색 입력 — DM/대화방 초대/커뮤니티 관리자 지정 공용.
// 닉네임(공개 핸들)만 다룬다. 디바운스 200ms.
export function NicknameAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  maxLength = 8,
  className,
  exclude = [],
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      searchMembers(q)
        .then((list) => {
          if (!live) return;
          const filtered = list.filter((n) => !exclude.includes(n));
          setSuggestions(filtered);
          setOpen(filtered.length > 0);
          setActive(-1);
        })
        .catch(() => {
          /* noop */
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // exclude 는 의도적으로 의존성에서 제외(매 렌더 새 배열) — value 변화로만 재검색.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function pick(nick: string) {
    skipRef.current = true; // 선택 후 재검색 방지
    onChange(nick);
    onPick?.(nick);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            const picked = suggestions[active];
            if (picked) pick(picked);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={
          className ??
          'block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'
        }
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="card-shadow absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-stone-200/70 bg-white py-1 text-sm dark:border-stone-800 dark:bg-stone-900"
        >
          {suggestions.map((nick, i) => (
            <li key={nick}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(nick);
                }}
                className={`block w-full px-4 py-2 text-left text-stone-800 dark:text-stone-100 ${
                  i === active ? 'bg-stone-100 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                {nick}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
