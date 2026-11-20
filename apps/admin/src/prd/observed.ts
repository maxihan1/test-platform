// 표준 기획서 확인 필요 항목의 현재 동작 칸 — 모양 검사와 견주기 (도메인/작성 §3.6 「★ 결정 목록」 「판정 요청 카드」)

import type { PrdItem, PrdObserved } from '@platform/kit';

// 글 두 칸은 요구 문장 상한, 빌드 번호는 근거 자리 상한과 같다(rules.ts 상한)
const 글상한 = 1000;
const 빌드상한 = 200;
const 횟수상한 = 9999;

// 실행 번호가 아닌 곳 — 게임 탐색 플레이 · 앱 탐색(빈 곳 해 보기) · 앱 문구(APK 문자열 표) · 앱 작성 중 디바이스 실행(폰 돌려 보기) (도메인/작성 §3.6 「★ 앱 탐색」 결정 9)
const 작성에서본곳: ReadonlySet<unknown> = new Set(['EXPLORE', 'APP_EXPLORE', 'APP_STRINGS', 'APP_TRIAL']);

const 글자 = (값: unknown, 최대: number): string | null => (typeof 값 === 'string' && 값.trim() !== '' && 값.length <= 최대 ? 값 : null);

/** 틀리면 null. 확정 항목에 와도 받는다 — 떼는 것은 판을 지을 때다(rules.ts 표시달기). 사람이 확정으로 바꾼 판을 이 칸 하나로 거절하지 않게 */
export function 본것읽기(값: unknown): PrdObserved | null {
  if (typeof 값 !== 'object' || 값 === null) return null;
  const o = 값 as Record<string, unknown>;
  const text = 글자(o.text, 글상한);
  const proposal = 글자(o.proposal, 글상한);
  const where = 작성에서본곳.has(o.where) || (typeof o.where === 'number' && Number.isSafeInteger(o.where) && o.where > 0) ? (o.where as PrdObserved['where']) : null;
  const 빌드없음 = o.build === undefined || o.build === null;
  const build = 빌드없음 ? null : 글자(o.build, 빌드상한);
  const count = o.count;
  if (text === null || proposal === null || where === null || (!빌드없음 && build === null)) return null;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1 || count > 횟수상한) return null;
  return { text, proposal, where, build, count };
}

/** 실행(RUN)에서 본 현재 동작은 실행을 못 보는 사람에게 안 준다 — 결정 목록과 같은 거르기(도메인/인증 §7 「결정 목록 보기」) */
export function 실행본것가리기(items: PrdItem[], 실행읽기: boolean): PrdItem[] {
  if (실행읽기) return items;
  return items.map((x) => {
    if (typeof x.observed?.where !== 'number') return x;
    const { observed: _뺌, ...나머지 } = x;
    return 나머지;
  });
}

// JSON 글자로 견주지 않는다 — JSONB 는 키 차례를 바꿔 저장한다
export const 본것같나 = (a: PrdObserved | undefined, b: PrdObserved | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.text === b.text && a.proposal === b.proposal && a.where === b.where && a.build === b.build && a.count === b.count);

/**
 * 확인 필요 항목에 달 현재 동작 — 보낸 것이 없으면 `물려줄것`(앞 판이 확인 필요였을 때)의 값을 물려받는다.
 * 부르는 쪽은 사람이 요구를 그대로 두고 저장할 때만 물려준다 — 사람 편집 화면은 이 칸을 안 보내고, 문장을 고치면 옛 관찰은 새 문장과 안 맞는다.
 * 옮기기(에이전트)는 지금 판 항목을 칸째 되돌려 보내므로 보낸 것만 쓴다 — 빼고 보내면 낡은 관찰이 지워진다. 확정 항목에는 부르지 않는다
 */
export function 본것물려받기(보낸것: PrdObserved | undefined, 물려줄것: PrdItem | undefined): { observed?: PrdObserved } {
  const 본것 = 보낸것 ?? (물려줄것?.status === 'NEEDS_CHECK' ? 물려줄것.observed : undefined);
  return 본것 === undefined ? {} : { observed: 본것 };
}
