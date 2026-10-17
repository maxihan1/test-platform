// E2E 시나리오 결과 · 실행 기록 화면이 쓰는 계산 모음. 화면 없이 검사하려고 순수 함수로 뗐다

import type { ScenarioLink } from '@platform/kit';

import type { ItemStatus } from './api.js';
import { t, type 언어 } from './i18n.js';
import { 시간초과 } from './runState.js';
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

/**
 * 단계 · 시험 결과의 멈춘 사유에 오는 상태 코드를 사람 말로 (§8.11 「화면 글자」).
 * `TIMEOUT` 은 러너가 시나리오 제한 시간에 끊은 것, `ABORTED` 는 서버 재시작 복구(`recoverRunning`)가 남은 단계를 닫은 것이다 —
 * E2E 에는 멈춤 버튼이 없어 사람이 멈춘 갈래가 없다. 그 밖은 서버 · 러너가 쓴 문장이라 그대로 둔다.
 * `ABORTED` 를 케이스 쪽(`runState.ts` · `reporting/collect.ts`)과 다르게 적는 까닭이 이것이다 — 케이스는 사람의 멈춤과 재기동을 못 가른다
 */
export function 멈춘사유글자(message: string, 언어: 언어): string {
  if (message === 시간초과) return t('제한 시간 초과', 언어);
  if (message === 'ABORTED') return t('서버 재시작으로 멈춤', 언어);
  return message;
}

export function 멈춘단계글자(줄: ScenarioRunRow, 언어: 언어): string {
  if (줄.status === 'RUNNING') return '';
  if (줄.stoppedAt !== null) return t('{번호}번에서 멈춤', 언어, { 번호: 줄.stoppedAt });
  // 단계 기록 없이 닫힌 실행도 stoppedAt 이 비어 있다 — 판정 칩 「미실행」 아래 「모두 통과」가 서면 거짓이다
  return 줄.verdict === 'PASS' ? t('모두 통과', 언어) : '';
}

/** 판정이 아닌 것(도는 중 · 판정 없음)에는 판정 색을 안 쓴다. 미확정이 섞여도 통과는 통과 색이다 */
export function E2E띠색(줄: ScenarioRunRow): string {
  if (줄.status === 'RUNNING') return 'var(--line-2)';
  if (줄.verdict === 'PASS') return 'var(--pass)';
  if (줄.verdict === 'FAIL') return 'var(--fail)';
  if (줄.verdict === 'NA') return 'var(--na)';
  return 'var(--line-2)';
}

/**
 * 잡히지 않은 오류(pageerror)의 stack 을 한 줄로 — 오류 문장과 처음 부른 자리(파일 이름:줄)만.
 * 실패 자리에서 원인을 바로 읽게 한다. 전체 stack 은 아래 콘솔 탭에 그대로 있다
 */
export function 화면오류한줄(stack: string): string {
  const 줄들 = stack.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const 머리 = (줄들[0] ?? '').replace(/^\w*Error: /, '');
  const 자리 = 줄들.find((l) => l.startsWith('at '))?.match(/^at (?:(\S+) )?\(?(?:.*\/)?([^/\s()]+?):(\d+)(?::\d+)?\)?$/);
  if (자리 === null || 자리 === undefined) return 머리;
  const [, 함수, 파일, 번호] = 자리;
  return 함수 === undefined ? `${머리} at ${파일}:${번호}` : `${머리} at ${함수} (${파일}:${번호})`;
}
