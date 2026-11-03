// 실행 창의 「테스트 실행」 조각 — 케이스 줄마다 붙는 결과 배지 (도메인/실행 §8.10)
// 한 건 · 여러 건이 같은 큐(useTrialQueue)로 돈다. 한 건짜리 화면의 따로 된 조각(TestRun)은 2026-10-09 에 합쳤다

import { useEffect } from 'react';

import type { CaseRow, TrialResult } from './api.js';
import { use말, use언어 } from './i18n.js';
import { type 고친값표, 실행항목 } from './pickRun.js';
import { seconds, Verdict } from './ui.js';
import { type 시험줄, useTrialQueue } from './useTrialQueue.js';

/**
 * 실행 창의 「▶ 테스트 실행」 상태와 동작을 한 벌로 든다. 위에서 고른 대상 서버로 서버 러너에서 돈다 —
 * 열 주소 칸은 2026-11-03 TMO 에 걷었다(서버가 대상 서버 이름으로 주소를 찾는다 · 도메인/실행 §8.10).
 * `알림` 은 창의 한 줄이다 — 도는 중에 또 누른 말은 큐가 끝나면 걷는다. 안 걷으면 건수 안내를 계속 가린다
 */
export function use여러건시험(옵션: {
  케이스들: CaseRow[];
  고친값: 고친값표;
  env: string;
  알림: (바꿈: (전: string | null) => string | null) => void;
}) {
  const { 케이스들, 고친값, env, 알림 } = 옵션;
  const t = use말();
  const 큐 = useTrialQueue();
  const 바쁨글 = t('이미 테스트 실행이 돌고 있습니다');

  useEffect(() => {
    if (!큐.도는중) 알림((전) => (전 === 바쁨글 ? null : 전));
  }, [큐.도는중]);

  return {
    줄들: 큐.줄들,
    누름: () => {
      // 버튼은 죽이지 않는다. 도는 중에 또 누르면 사유를 말한다 (DESIGN.md)
      if (큐.도는중) return 알림(() => 바쁨글);
      // 한 건 창에서 디바이스를 다 끄면 돌릴 것이 없다. 큐는 첫 디바이스를 꺼내 쓰므로 빈 채로 보내면 안 된다
      if (케이스들.some((c) => c.platforms.length === 0)) return 알림(() => t('실행할 디바이스를 하나 이상 고르세요.'));
      if (env === '') return 알림(() => t('테스트 실행할 대상 서버를 고르세요.'));
      void 큐.시작(실행항목(케이스들, 고친값), env);
    },
  };
}

/** 케이스 줄 오른쪽 끝의 한 칸. 아직 안 돌렸으면 아무것도 안 그린다 */
export function 시험배지({ 줄 }: { 줄: 시험줄 | undefined }) {
  const t = use말();
  const 언어 = use언어();
  if (줄 === undefined) return null;

  if (줄.종류 === 'wait') return <span className="trial-badge dim">{t('대기')}</span>;
  if (줄.종류 === 'run') return <span className="trial-badge dim">{t('실행 중')}</span>;
  if (줄.종류 === 'notice') return <span className="trial-badge err">{줄.글}</span>;

  return (
    <span className="trial-badge">
      <Verdict status={줄.결과.status} />
      <span className="dur">{seconds(줄.결과.durationMs, 언어)}</span>
      {/* 러너에 못 닿은 사정도 서버가 준 문장을 그대로 낸다 */}
      {줄.결과.error === undefined ? null : <span className="err">{줄.결과.error.message}</span>}
    </span>
  );
}

/**
 * 한 건 창에서는 배지 아래에 절차마다 판정을 펼친다 — 한 건짜리 화면의 테스트 실행이 보여 주던 것이다.
 * 여러 건이면 줄이 길어져 배지만 둔다 (도메인/실행 §8.10)
 */
export function 시험절차({ 결과 }: { 결과: TrialResult }) {
  return (
    <ol className="trial-steps">
      {결과.steps.map((step) => (
        <li key={step.seq} className={step.status === 'FAIL' ? 'trial-step fail' : 'trial-step'}>
          <Verdict status={step.status} />
          <span>{step.title}</span>
          {step.error === undefined ? null : <span className="err">{step.error.message}</span>}
        </li>
      ))}
    </ol>
  );
}
