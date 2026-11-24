// 실행 결과 위의 길 — 왼쪽 「← 실행 기록」, 오른쪽 「‹ 이전 실행 · 다음 실행 ›」 (도메인/실행 §8.7 「목록 화면과 결과 화면을 따로」)
// 케이스 결과(RunResult)와 E2E 결과(ScenarioResult)가 같이 쓴다

import type { ReactNode } from 'react';

import { api } from './api.js';
import { use말 } from './i18n.js';
import { 주소조건 } from './leaveGuard.js';
import { 실행결과주소 } from './route.js';
import { useAsync } from './ui.js';

/** 실행 기록에서 넘어올 때 걸어 둔 조건(주소의 `list=`). 다른 고리로 바로 열었으면 빈 글이다 */
export const 목록조건읽기 = (): string => 주소조건().get('list') ?? '';

/** 그 조건이 걸린 실행 기록 주소. 조건에 애플리케이션이 없을 때만(알림처럼 목록을 안 거치고 열었을 때) 접두사를 달아 그 실행의 애플리케이션 목록으로 간다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」) */
export function 실행기록주소(목록: 'fn' | 'ui' | 'e2e', 조건글: string, 접두사: string | null): string {
  const 조건 = new URLSearchParams(조건글);
  if (접두사 !== null && !조건.has('service')) 조건.set('service', 접두사);
  const 글 = 조건.toString();
  return 글 === '' ? `#/runs/${목록}` : `#/runs/${목록}?${글}`;
}

/** @param 돌아갈 실행 기록이 아닌 곳에서 들어온 결과의 돌아가는 고리(E2E 테스트 목록 · 시나리오). 주면 「← 실행 기록」 자리에 선다 */
export function 실행길({ runId, 목록, 접두사, 돌아갈 }: { runId: number; 목록: 'fn' | 'ui' | 'e2e'; 접두사: string | null; 돌아갈?: ReactNode }) {
  const t = use말();
  const 조건글 = 목록조건읽기();
  // 못 받으면 두 단추가 꺼진 채 선다 — 결과는 그대로 본다
  const 앞뒤 = useAsync(() => api.runNeighbors(runId, 조건글), [runId, 조건글]);
  const 옆 = (번호: number | null | undefined, 글: ReactNode) =>
    번호 == null ? (
      <button type="button" className="btn small ghost" disabled>
        {글}
      </button>
    ) : (
      <a className="btn small ghost" href={실행결과주소(번호, { 목록: 조건글 })}>
        {글}
      </a>
    );
  return (
    <nav className="run-nav" aria-label={t('실행 기록')}>
      {돌아갈 ?? (
        <a className="btn small ghost" href={실행기록주소(목록, 조건글, 접두사)}>
          ← {t('실행 기록')}
        </a>
      )}
      <span className="run-nav-sp" />
      {옆(앞뒤.data?.prev, <>‹ {t('이전 실행')}</>)}
      {옆(앞뒤.data?.next, <>{t('다음 실행§실행 결과')} ›</>)}
    </nav>
  );
}
