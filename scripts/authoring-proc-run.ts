// 폰 돌려 보기의 프로시저 몫 — 통째로 돈 기록에서 케이스마다 판정을 읽고 견주며, 한 번 부름의 끝에 끊긴 프로시저를 가른다 (SPEC 도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「돌려 보기 — 프로시저 통째로 1번」)
// 돌려 보기는 kit 리포터 없이 Playwright json 을 읽어서 케이스 판정은 kit 이 남긴 첨부(platform-case)에서 읽는다 (도메인/러너 §5.2 「프로시저 실행」)

import { stripVTControlCharacters } from 'node:util';

import { BLOCKED, CASE_ATTACHMENT } from '@platform/kit/protocol';

import type { 돌린판 } from './authoring-gate3.js';
import { type 판정, 기록자리, 판정하기 } from './authoring-phone-split.js';
import { 프로시저값읽기 } from './authoring-proc-pieces.js';

/** 색 글자를 빼고 첫 줄만 — 오류 글 전체는 길고 대화 토큰을 먹는다 */
export function 첫줄(글: string): string {
  return (stripVTControlCharacters(글).split('\n').find((줄) => 줄.trim() !== '') ?? '').trim().slice(0, 200);
}

/** 통째로 돈 프로시저 한 판에서 케이스 하나. 보류로 건너뛴 케이스는 초록이다(「다 초록(보류 건너뜀 포함)」) */
export interface 케이스판 {
  tcId: string;
  상태: '초록' | '빨강' | '막힘';
  /** 막힘일 때 막은 케이스 */
  막은?: string;
  오류: string | null;
}

// kit 이 보류 케이스에 다는 사유의 머리 — 공유 타입 `held` 칸
const 보류꼴 = /^(판정 불가|보류) — /;

interface 첨부글 {
  name?: unknown;
  body?: unknown;
}

/**
 * 마지막 회차의 kit 판정 첨부 — 같은 케이스를 다시 냈으면 뒤 것이다(끝 정리를 더한 판정). 재시도가 있으면 앞 회차 판정이 섞이지 않게 마지막 회차만 본다.
 * 첨부가 하나도 없으면(옛 꼴 · kit 이 판정 전에 죽음) undefined
 */
export function 케이스판읽기(회차들: readonly { attachments?: 첨부글[] }[] | undefined): 케이스판[] | undefined {
  const 판들 = new Map<string, 케이스판>();
  for (const a of 회차들?.at(-1)?.attachments ?? []) {
    if (a.name !== CASE_ATTACHMENT || typeof a.body !== 'string') continue;
    let r: { tcId?: unknown; status?: unknown; blockedBy?: unknown; error?: { message?: unknown }; steps?: { assertions?: { statement?: unknown; status?: unknown }[] }[] };
    try {
      // Playwright json 리포터는 첨부 몸을 base64 로 싣는다
      r = JSON.parse(Buffer.from(a.body, 'base64').toString('utf8')) as typeof r;
    } catch {
      continue;
    }
    if (typeof r.tcId !== 'string') continue;
    const 말 = typeof r.error?.message === 'string' ? r.error.message : null;
    const 틀린문장 = (r.steps ?? []).flatMap((s) => s.assertions ?? []).find((x) => x.status === 'FAIL' && typeof x.statement === 'string')?.statement;
    const 상태 = r.status === 'PASS' || (말 !== null && 보류꼴.test(말)) ? '초록' : 말 === BLOCKED ? '막힘' : '빨강';
    판들.set(r.tcId, {
      tcId: r.tcId,
      상태,
      ...(상태 === '막힘' && typeof r.blockedBy === 'string' ? { 막은: r.blockedBy } : {}),
      오류: 상태 !== '빨강' ? null : 말 !== null ? 첫줄(말) : typeof 틀린문장 === 'string' ? `검증 실패: ${틀린문장}` : null,
    });
  }
  return 판들.size === 0 ? undefined : [...판들.values()];
}

/** 프로시저 파일이면 `cases` 차례의 케이스 번호, 아니면 null. 글자를 먼저 봐 옛 꼴 파일은 구문 분석을 안 한다 */
export function 프로시저케이스들(글: string): string[] | null {
  return /\bdefineProcedure\s*\(/.test(글) ? (프로시저값읽기(글)?.케이스 ?? null) : null;
}

/** 파일마다 케이스 수 — 프로시저는 든 케이스 수, 옛 꼴은 1. 끝 검사 · 출력은 케이스로 센다. 파일마다 한 번만 읽는다 */
export function 케이스세기(글: (파일: string) => string): { 목록: (파일: string) => string[] | null; 수: (파일들: readonly string[]) => number } {
  const 맵 = new Map<string, string[] | null>();
  const 목록 = (f: string) => {
    if (!맵.has(f)) 맵.set(f, 프로시저케이스들(글(f)));
    return 맵.get(f)!;
  };
  return { 목록, 수: (파일들) => 파일들.reduce((합, f) => 합 + (목록(f)?.length ?? 1), 0) };
}

/** 케이스 하나의 판정 — 앞 케이스에 막혀 한 번도 못 돈 케이스는 막힘이다 */
export type 케이스판정 = 판정 | { 상태: '막힘'; 막은: string };

/**
 * 프로시저 파일의 케이스마다 판정과, 고르기에 쓰는 파일 판정. 빨간 케이스를 다른 폰 · 계정으로 다시 보는 것도 프로시저를 통째로 다시 돌려 케이스마다 견준다.
 * 막힌 판은 그 케이스가 안 돈 것으로 본다. 케이스 판을 못 남긴 판(폰 연결에서 죽음)은 모든 케이스에 그 판의 상태를 그대로 쓴다.
 * 파일 판정은 다시 볼 케이스가 있으면 그 「다시」, 다 초록이면 초록, 아니면 끝난 것이다 — 막힘만 남아도 다시 돌지 않는다(고치기 전에는 또 막힌다)
 */
export function 프로시저판정(케이스들: readonly string[], 판들: readonly 돌린판[] | undefined, 수정: number, 있는폰들: readonly string[], 계정들: readonly number[]): { 파일: 판정; 케이스: [string, 케이스판정][] } {
  const 새판 = (판들 ?? []).filter((p) => Number.isFinite(p.시작) && p.시작 >= 수정);
  if (새판.length === 0) return { 파일: { 상태: '안돎' }, 케이스: 케이스들.map((t) => [t, { 상태: '안돎' }]) };
  const 늦은판 = 새판.reduce((a, b) => (b.시작 > a.시작 ? b : a));
  const 케이스 = 케이스들.map((tcId): [string, 케이스판정] => {
    const 한판들 = 새판.flatMap((p) => {
      const 자리 = { ...기록자리(p.기록), 시작: p.시작 };
      const k = p.케이스들?.find((x) => x.tcId === tcId);
      // 그 케이스의 판정 첨부가 없으면(kit 이 판정 전에 죽음) 그 판의 파일 상태를 쓴다 — 안 돈 케이스가 초록으로 남지 않게
      if (k === undefined) return [{ ...자리, 빨강: p.상태들.includes('unexpected'), 오류: p.오류 }];
      return k.상태 === '막힘' ? [] : [{ ...자리, 빨강: k.상태 === '빨강', 오류: k.오류 }];
    });
    if (한판들.length > 0) return [tcId, 판정하기(한판들, 있는폰들, 계정들)];
    const 막힌 = 늦은판.케이스들?.find((x) => x.tcId === tcId);
    return [tcId, 막힌 === undefined ? { 상태: '안돎' } : { 상태: '막힘', 막은: 막힌.막은 ?? '앞 케이스' }];
  });
  const 다시 = 케이스.find(([, p]) => p.상태 === '다시');
  if (다시 !== undefined) return { 파일: 다시[1] as 판정, 케이스 };
  const 남은 = 케이스.find(([, p]) => p.상태 !== '초록');
  if (남은 === undefined) return { 파일: { 상태: '초록' }, 케이스 };
  const [t, p] = 남은;
  // 파일 판정은 고르기에만 쓴다 — 출력 · 끝 검사는 케이스 줄로 센다
  return { 파일: p.상태 === '막힘' || p.상태 === '안돎' ? { 상태: '빨강', 오류: `${t} 가 앞 케이스에 막혔다` } : p.상태 === '빨강' || p.상태 === '폰차이' || p.상태 === '계정차이' ? { ...p, 오류: `${t}: ${p.오류}` } : p, 케이스 };
}

/** 폰판정들 한 줄 — 프로시저 파일만 케이스 줄이 붙는다 */
export type 판정줄 = [파일: string, 판정: 판정, 케이스들?: [string, 케이스판정][]];

/** 앞 케이스에 막힌 케이스 꼬리 */
export const 막힌꼬리 = (p: 케이스판정): string => (p.상태 === '막힘' ? `(${p.막은} 에 막힘)` : '');

/** 돌려 보기 출력의 막힘 묶음 — 막힌 케이스는 못 돌려 본 것이라 남긴 채 끝내지 않는다. 없으면 null */
export function 막힘말(줄들: readonly [string, 케이스판정][]): string | null {
  const 막힘 = 줄들.filter(([, p]) => p.상태 === '막힘');
  if (막힘.length === 0) return null;
  const 머리 = `막힘 ${막힘.length}건 — 앞 케이스에 막혀 못 돌았다. 막은 케이스가 깨짐이면 고쳐 다시 돌리고, 값 다름이라 빨간 채 둘 것이면 그 케이스를 맨 뒤로(그래도 막히면 따로 프로시저로) 옮긴다`;
  return [머리, ...막힘.map(([f, p]) => `- ${f} ${막힌꼬리(p)}`)].join('\n');
}

/** 끝 검사 · 출력이 세는 단위 — 옛 꼴은 파일 하나가 케이스 하나, 프로시저는 케이스마다 `<파일> <케이스 번호>` */
export const 케이스줄들 = (줄들: readonly 판정줄[]): [string, 케이스판정][] =>
  줄들.flatMap(([파일, p, 케이스들]): [string, 케이스판정][] => (케이스들 === undefined ? [[파일, p]] : 케이스들.map(([t, k]) => [`${파일} ${t}`, k])));

/** 끝까지 못 돈 판 — 한 번 부름의 시간 상한에 걸려 끊겼다. `혼자` 는 그 기록에 이 파일만 있었다(맨 먼저 돌았다) */
export interface 끊긴판 {
  기록: string;
  시작: number;
  혼자: boolean;
}

/**
 * 끊긴 뒤로 끝까지 돈 기록이 없는 프로시저. 먼저 — 다음 부름에서 그것만 폰마다 하나씩 혼자 돈다(Playwright 는 파일 이름 차례로 돌아 섞으면 맨 먼저가 안 된다).
 * 못끝냄 — 혼자 돌고도 끊겼다. 다시 돌려도 같아 AI 가 나눈다(프로시저 짜기 2).
 * ponytail: PC 게임은 윈도우 값마다 차례로 돌아 둘째 값이 앞 값에 시간을 뺏기고 끊겨도 혼자로 읽힌다 — 값 여럿인 프로시저가 잦아지면 기록에 남은 예산을 싣는다
 */
export function 끊긴프로시저들(대상: Record<string, number>, 판들: Map<string, 돌린판[]>, 끊김: Map<string, 끊긴판[]>, 프로시저인가: (파일: string) => boolean): { 먼저: Set<string>; 못끝냄: Set<string> } {
  const 먼저 = new Set<string>();
  const 못끝냄 = new Set<string>();
  for (const [파일, 수정] of Object.entries(대상)) {
    if (!프로시저인가(파일)) continue;
    const 끊긴 = (끊김.get(파일) ?? []).filter((p) => p.시작 >= 수정).sort((a, b) => b.시작 - a.시작)[0];
    if (끊긴 === undefined || (판들.get(파일) ?? []).some((p) => p.시작 >= 끊긴.시작)) continue;
    (끊긴.혼자 ? 못끝냄 : 먼저).add(파일);
  }
  return { 먼저, 못끝냄 };
}
