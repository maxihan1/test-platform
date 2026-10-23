// E2E 마법사 「값 연결」 · 「시험 실행」이 쓰는 계산 — 제안 합치기 · 로그인 이어받기 · 값 연결이 쓰였는지. 화면 없이 검사하려고 순수 함수로 뗐다

import type { ScenarioLink, ScenarioPart } from '@platform/kit';

import { 원인을가른다, 한줄로자른다 } from '../reporting/failureType.js';
import type { 항목실패 } from '../reporting/itemFailure.js';
import { t, type 언어 } from './i18n.js';
import type { LinkSuggestion, TrialResult } from './scenarioApi.js';
import { 빈연결, 이미실행, type 재료들 } from './scenarioView.js';

/** 값을 가져올 단계 번호. 요청 차단은 앞 단계가 없다 */
export function 가져올번호(l: ScenarioLink): number | null {
  if (l.kind === 'reuse') return l.fromSeq;
  if (l.kind === 'bind') return l.value.fromSeq;
  if (l.kind === 'rewrite') return l.to.value.fromSeq;
  return null;
}

const 번호의케이스 = (parts: ScenarioPart[], 번호: number | null): string => {
  const p = 번호 === null ? undefined : parts[번호 - 1];
  return p?.kind === 'case' ? p.tcId : '';
};

/**
 * 받는 케이스 · 가져올 케이스 · 종류. 단계 차례가 바뀌어도 같은 두 케이스를 잇는 값 연결은 같은 열쇠다
 * (도메인/시나리오 §8.11 「마법사」 — 같은 두 케이스 · 같은 종류면 그대로 둔다)
 */
export const 연결열쇠 = (parts: ScenarioPart[], 받는번호: number, l: ScenarioLink): string =>
  `${번호의케이스(parts, 받는번호)}|${번호의케이스(parts, 가져올번호(l))}|${l.kind}`;

/** 제안을 받는 단계에 단다. 같은 열쇠가 이미 있거나 사람이 지운 것은 건너뛴다 */
export function 제안합치기(parts: ScenarioPart[], 제안들: LinkSuggestion[], 지운: ReadonlySet<string>): ScenarioPart[] {
  const 새 = [...parts];
  for (const s of 제안들) {
    const p = 새[s.toSeq - 1];
    if (p?.kind !== 'case') continue;
    const 열쇠 = 연결열쇠(새, s.toSeq, s.link);
    if (지운.has(열쇠) || (p.links ?? []).some((l) => 연결열쇠(새, s.toSeq, l) === 열쇠)) continue;
    새[s.toSeq - 1] = { ...p, links: [...(p.links ?? []), s.link] };
  }
  return 새;
}

/** 받는 번호 · 값 연결 · 그 단계 안 자리. 케이스 단계에 단 것만 */
export function 연결들(parts: ScenarioPart[]): { 받는번호: number; link: ScenarioLink; 자리: number }[] {
  return parts.flatMap((p, i) => (p.kind === 'case' ? (p.links ?? []).map((link, 자리) => ({ 받는번호: i + 1, link, 자리 })) : []));
}

/** 다음으로 못 가는 까닭. 가져올 단계가 지워졌거나 받는 단계보다 뒤로 갔으면 gone, 서버가 막는 빈 칸이 있으면 blank */
export function 연결상태(parts: ScenarioPart[], 받는번호: number, l: ScenarioLink): 'gone' | 'blank' | null {
  const 앞 = 가져올번호(l);
  if (앞 !== null && (앞 < 1 || 앞 >= 받는번호 || parts[앞 - 1]?.kind !== 'case')) return 'gone';
  return 빈연결(l) ? 'blank' : null;
}

/**
 * 로그인 이어받기 — 켜면 케이스 단계마다 같은 애플리케이션 앞 단계가 이미 실행한 건너뛸 수 있는 사전 단계를 건너뛴다. 끄면 다 실행한다.
 * 조립 화면 「N번에서 이미 실행」 칩과 같은 계산이다(결정 5). 재료가 아직 없는 단계는 건너뛰지 않는다
 */
export function 이어받기적용(parts: ScenarioPart[], 재료: 재료들, 켬: boolean): ScenarioPart[] {
  return parts.map((p, i) => {
    if (p.kind !== 'case' || p.carryOver === false) return p;
    const 건너뛸 = 켬 ? (재료.get(p.tcId)?.steps ?? []).filter((s) => s.skippable && 이미실행(parts, 재료, i + 1, s.title) !== null) : [];
    return { ...p, skipSteps: 건너뛸.map((s) => s.title) };
  });
}

/** 건너뛰는 사전 단계를 처음 실행하는 단계 번호 — 「N번부터 끝까지 같은 계정으로」의 N. 건너뛸 것이 없으면 null */
export function 이어받기처음(parts: ScenarioPart[], 재료: 재료들): number | null {
  let 처음: number | null = null;
  parts.forEach((p, i) => {
    if (p.kind !== 'case' || p.carryOver === false) return;
    for (const s of 재료.get(p.tcId)?.steps ?? []) {
      if (!s.skippable) continue;
      const 앞 = 이미실행(parts, 재료, i + 1, s.title);
      if (앞 !== null && (처음 === null || 앞 < 처음)) 처음 = 앞;
    }
  });
  return 처음;
}

// 러너가 「적용되지 않은 값 연결」 꼬리에 쓰는 종류 이름 (apps/runner/scenario/links.ts 안걸린)
const 꼬리이름 = { reuse: '이전 응답 재사용', block: '요청 차단', rewrite: '수정 요청으로 변경' } as const;
const 꼬리머리 = '적용되지 않은 값 연결 — ';

/**
 * 시험 실행 뒤 값 연결이 쓰였는지 — 재료는 지금 결과 칸뿐이다 (도메인/시나리오 §3.7 결정 15 「쓰였는지」).
 * 값 주입은 그 단계의 bound 에 칸이 있으면 쓰임. 나머지는 실패한 단계의 꼬리에 있으면 안 쓰임 — 꼬리는 케이스가 돈 뒤 실패에만 붙는다
 */
export function 쓰였나(결과: TrialResult, 받는번호: number, l: ScenarioLink, 말: 언어): string {
  const r = 결과.parts.find((p) => p.seq === 받는번호);
  if (r === undefined || (r.status === 'NA' && r.error?.message === 'NOT_RUN')) return t('실행 안 됨', 말);
  if (l.kind === 'bind') return t(l.param in (r.bound ?? {}) ? '쓰임' : '안 쓰임', 말);
  if (r.status === 'PASS') return t('통과 · 쓰였는지는 결과에 남지 않습니다', 말);
  const 꼬리 = (r.error?.message ?? '').split('\n').find((줄) => 줄.startsWith(꼬리머리));
  if (꼬리 === undefined) return t('멈춤 · 쓰였는지는 결과에 남지 않습니다', 말);
  return t(꼬리.slice(꼬리머리.length).split(' · ').includes(`${꼬리이름[l.kind]} ${l.method} ${l.urlPattern}`) ? '안 쓰임' : '쓰임', 말);
}

// 러너가 끊은 자리의 상태 글자(TIMEOUT 따위)는 사람 말이 아니다 — 유형 꼬리표가 대신 말한다
const 러너글자 = /^[A-Z][A-Z_]*$/;

/**
 * 멈춘 단계의 실패 유형 · 한 줄 — 시험 결과에는 정식 실행의 `parts[].failure` 가 없어 화면에서 고른다 (E2E-F2-06 시험).
 * 서버 고르기(reporting/itemFailure.ts)와 같은 부품 · 같은 차례(실패한 첫 확인 문장 → 단계 오류)다. 그 파일은 kit 의 응답 모양 문장을 가져와
 * playwright 까지 번들에 끌려 오므로 부르지 못한다 — 응답 모양만 틀린 실패는 한 줄 없이 유형 꼬리표만 선다. 비밀값은 서버가 이미 가렸다
 */
export function 멈춘까닭(part: TrialResult['parts'][number]): 항목실패 | null {
  if (part.status === 'PASS' || part.error?.message === 'NOT_RUN') return null;
  const 확인 = part.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL');
  const 모양틀림 = part.steps.some((s) => (s.shapeChecks ?? []).some((c) => c.result === 'FAIL'));
  const 원인 = 원인을가른다({
    status: part.status,
    assertFailed: 확인 !== undefined || 모양틀림,
    itemMessage: part.error?.message ?? '',
    stepMessage: part.steps.find((s) => s.error !== undefined)?.error?.message ?? '',
  });
  if (원인 === 'stopped') return null;
  const 한줄 = 한줄로자른다(확인?.statement || part.error?.message || '');
  return { type: 원인, reason: 러너글자.test(한줄) ? '' : 한줄 };
}
