import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl text-center">
        <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-gray-500 mb-6">
          Coming soon · 2026
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          Chronos Health
        </h1>
        <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-10">
          Digital twin healthcare × decentralized data sovereignty.
          <br />
          당신의 건강 데이터로 더 오래 건강한 삶을.
        </p>
        <Link
          href="/survey"
          className="inline-block px-8 py-4 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          베타 설문 시작 →
        </Link>
        <p className="mt-10 text-xs text-gray-400">
          Phase 0 · Foundation · 만 19세 이상만 참여 가능
        </p>
      </div>
    </main>
  );
}
