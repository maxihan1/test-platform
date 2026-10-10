// E2E 시나리오 결과 · 실행 기록 화면이 쓰는 계산 모음. 화면 없이 검사하려고 순수 함수로 뗐다

import type { ScenarioLink } from '@platform/kit';

import type { ItemStatus } from './api.js';
import { t, type 언어 } from './i18n.js';
import type { ScenarioRunPart, ScenarioRunRow } from './scenarioApi.js';

/** 도는 동안 부품은 전부 NA 라 부품만 보면 틀리게 나온다. 판정은 끝난 뒤에만 낸다 */
export function 접은판정(parts: { status: ItemStatus }[], status: string): ItemStatus | null {
  if (status === 'RUNNING') return null;
  if (parts.length > 0 && parts.every((p) => p.status === 'PASS')) return 'PASS';
  return parts.some((p) => p.status === 'FAIL') ? 'FAIL' : 'NA';
}

export function 미확정있나(parts: { unconfirmed: string | null }[]): boolean {
  return parts.some((p) => p.unconfirmed !== null);
}

/** 앞 case 단계 중 그 제목의 절차를 건너뛰지 않고 돈 첫 단계 번호 */
export function 건너뜀번호(parts: ScenarioRunPart[], seq: number, 제목: string): number | null {
  for (const p of parts) {
    if (p.seq >= seq) break;
    if (p.kind === 'case' && p.steps.some((s) => s.title === 제목 && s.skipped !== true)) return p.seq;
  }
  return null;
}

export function 값연결글(link: ScenarioLink, bound: Record<string, unknown>, 언어: 언어): { 종류: string; 글: string } {
  if (link.kind === 'bind') {
    const { param, value } = link;
    const 글 = t('{칸} ← {번호}번 {메서드} {무늬} 응답의 {경로}', 언어, {
      칸: param, 번호: value.fromSeq, 메서드: value.method, 무늬: value.urlPattern, 경로: value.jsonPath,
    });
    return { 종류: t('값 주입', 언어), 글: param in bound ? `${글} = ${String(bound[param])}` : 글 };
  }
  if (link.kind === 'block') return { 종류: t('요청 차단', 언어), 글: `${link.method} ${link.urlPattern}` };
  if (link.kind === 'reuse') {
    return {
      종류: t('이전 응답 재사용', 언어),
      글: t('{메서드} {무늬} ← {번호}번', 언어, { 메서드: link.method, 무늬: link.urlPattern, 번호: link.fromSeq }),
    };
  }
  return {
    종류: t('수정 요청으로 변경', 언어),
    글: `${link.method} ${link.urlPattern} → ${link.to.method} ${link.to.path}`,
  };
}

export function 멈춘단계글자(줄: ScenarioRunRow, 언어: 언어): string {
  if (줄.status === 'RUNNING') return '';
  return 줄.stoppedAt === null ? t('모두 통과', 언어) : t('{번호}번에서 멈춤', 언어, { 번호: 줄.stoppedAt });
}

/** 판정이 아닌 것(도는 중 · 판정 없음)에는 판정 색을 안 쓴다. 미확정이 섞여도 통과는 통과 색이다 */
export function E2E띠색(줄: ScenarioRunRow): string {
  if (줄.status === 'RUNNING') return 'var(--line-2)';
  if (줄.verdict === 'PASS') return 'var(--pass)';
  if (줄.verdict === 'FAIL') return 'var(--fail)';
  if (줄.verdict === 'NA') return 'var(--na)';
  return 'var(--line-2)';
}
