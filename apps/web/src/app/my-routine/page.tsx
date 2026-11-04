'use client';

// My Routine(마이 루틴) 주 탭 — 홈(라이프)에 있던 "오늘의 셀프 체크/오늘의 루틴" 카드를
// 별도 메인 탭으로 분리(하단 네비 AI 리포트와 AI 케어 사이). 상세 기록·주간 통계는
// TodaySelfCheck 내부 링크(/routine)로 이어진다. 로그인 상태 처리는 카드 내부에서 수행.

import { AppShell } from '@/components/AppShell';
import { TodaySelfCheck } from '@/components/TodaySelfCheck';
import { MyHealthConditions } from '@/components/MyHealthConditions';
import { useI18n } from '@/lib/i18n';

export default function MyRoutinePage() {
  const { t } = useI18n();
  return (
    <AppShell title={t.nav.myRoutine} decoration="dots">
      <MyHealthConditions />
      <TodaySelfCheck />
    </AppShell>
  );
}
