// QA 리포트 결과 요약 한 줄의 글 — 문서(qaReportText.ts)와 화면(실행 결과 화면 요약 띠)이 같은 말을 쓰게 한 곳에 둔다 (도메인/리포팅 §3.17 「결과 요약」 · §8.21 「다른 화면의 고리」)
// 화면이 부르므로 타입 말고는 아무것도 불러오지 않는다 — 문서 쪽 모듈(zod 를 부르는 AI 모양 검사)이 화면 묶음에 딸려 오지 않게

import type { 안정화출처, 안정화줄, 첫장 } from './qaReportSummary.js';

export const 종류이름 = { FN: '기능', UI: 'UI', E2E: 'E2E', COMPAT: '호환성', PERF: '성능', STAB: '안정화' } as const;
export const 품질특성 = { COMPATIBILITY: '호환성', PERFORMANCE_EFFICIENCY: '성능 효율성', RELIABILITY: '신뢰성' } as const;
export const 출처이름: Record<안정화출처, string> = {
  WEB_PAGEERROR: '페이지 오류',
  WEB_CONSOLE: '콘솔 오류',
  WEB_NETWORK: '네트워크 오류',
  APP_CRASH: '크래시',
  APP_ANR: 'ANR',
  GAME_EXCEPTION: 'Exception',
  GAME_CRASH: '크래시',
};
export function 안정화글(s: 안정화줄 | null): string {
  if (s === null) return '이 빌드로 실행한 정기 실행 없음';
  return [
    `판정은 통과했지만 오류가 난 케이스 ${s.passErrorCases}건 / 기록이 있는 케이스 ${s.cases}건${s.days > 1 ? ` (${s.days}일 중 마지막 날 기준)` : ''}`,
    s.sources.map((x) => `${출처이름[x.source]} 발생 케이스 ${x.cases}건`).join(' · '),
    `잔여 오류 ${s.residual} · 신규 ${s.newErrors} · 재발 ${s.reopened} · 해결 확인 ${s.confirmed}`,
  ]
    .filter((x) => x !== '')
    .join('\n');
}

/** 결과 요약 한 줄의 결과 칸 — 비기능 구획 머리(qaReportSections.ts)도 같은 글을 다시 싣는다 */
export function 결과글(x: 첫장['results']['functional'][number] | 첫장['results']['nonFunctional'][number]): string {
  if (x.result === null) return x.kind === 'STAB' ? 안정화글(null) : '이번 빌드에 실행 없음';
  switch (x.kind) {
    case 'COMPAT':
      return `디바이스 ${x.result.devices}대 · 화면 ${x.result.screens}개 · UI 결함 의심 ${x.result.suspect}곳`;
    case 'PERF':
      return `성능 목표 통과 ${x.result.pass} · 미달 ${x.result.fail} (실행 ${x.result.runs}회)`;
    case 'STAB':
      return 안정화글(x.result);
    default: {
      const v = x.result;
      return `통과 ${v.pass} · 실패 ${v.fail} · 미실행 ${v.notRun}${v.unconfirmed > 0 ? ` (그중 미확정 ${v.unconfirmed}건)` : ''}`;
    }
  }
}
