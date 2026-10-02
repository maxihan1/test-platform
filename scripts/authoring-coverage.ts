// 끝내기 result.coverage — 원장 대조에서 셈을 만들어 싣는다. 자식의 말이 아니라 에이전트가 센 것이다 (도메인/작성 §3.6 「★ 원장」)
// 서버의 모양 검사를 그대로 가져다 먼저 돌린다 — 셈 하나가 틀려 끝내기가 400 이 되면 PR · 보류 · 이어하기를 잃는다

import { type 커버리지, 커버리지모양검사 } from '../apps/admin/src/authoring/coverage.js';
import type { 보고손 } from './authoring-io.js';
import type { 원장 } from './authoring-ledger.js';
import type { 대조결과, 제외종류 } from './authoring-ledger-check.js';

/** 셈 재료 — 올리기가 원장 대조를 한 뒤에 선다. 그 전에 끝나면 없다(null) */
export type 셈재료 = { 대조: 대조결과; 원장: 원장 } | { 없음: string };

// 남은 요구로 이어 작성(③)이 맡을 번호를 따로 싣는다 — 종류 이름으로 가르면 서버가 목록을 옮겨 적어야 한다
const 다음요청: 제외종류 = '다음 요청';
const 이름상한 = 200;
// 끝내기 본문 상한은 1MiB(서버 기본값)다. 넘으면 400 이 아니라 413 이라 「셈만 빼고 다시」 길을 못 탄다 — 나머지 몸이 들어갈 자리를 남긴다
const 셈글상한 = 512 * 1024;

const 까닭상한 = 500;

const 물건인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 서버는 UTF-16 길이로 잰다 — 그 길이로 자르되 끝이 짝 잃은 앞쪽 서로게이트면 한 칸 더 뺀다.
 * 이모지를 가르면 jsonb 가 거절해 끝내기가 500 이 되고, 에이전트는 몇 분 다시 보내다 던진다
 */
function 자르기(글: string, 상한: number): string {
  if (글.length <= 상한) return 글;
  const 앞 = 글.slice(0, 상한);
  const 끝 = 앞.charCodeAt(앞.length - 1);
  return 끝 >= 0xd800 && 끝 <= 0xdbff ? 앞.slice(0, -1) : 앞;
}

/**
 * 셈을 만든다. `보류` 는 보류 케이스 tcId 들 — null 이면 모른다(보류 스캔은 DONE 때만 돈다 · 스캔 실패).
 * 보류로만 덮인 번호는 `cased` 에도 든다 — 보류 케이스도 덮는다(§3.6 「덮는다는 것」)
 */
export function 커버리지만들기(재료: 셈재료, 보류: Set<string> | null): 커버리지 {
  // 까닭에는 못 읽은 자료 이름이 줄지어 붙는다 — 길면 서버 상한에 걸려 셈이 통째로 빠진다
  if ('없음' in 재료) return { none: 자르기(재료.없음, 까닭상한) };
  const { 대조, 원장 } = 재료;
  const 보류로만 =
    보류 === null ? null : [...대조.덮음.values()].filter((tc) => [...tc].every((t) => 보류.has(t))).length;
  const excluded: Record<string, number> = {};
  for (const [종류, 수] of Object.entries(대조.셈.제외)) if (수 !== undefined) excluded[종류] = 수;
  return {
    total: 대조.셈.총,
    cased: 대조.셈.케이스,
    held: 보류로만,
    excluded,
    missing: 대조.빠짐,
    later: [...대조.제외번호].filter(([, 종류]) => 종류 === 다음요청).map(([번호]) => 번호),
    ...(대조.UI만.length > 0 ? { uiOnly: 대조.UI만 } : {}),
    // 자료 이름은 사람이 붙인 것이라 길 수 있다 — 서버 상한에 걸려 셈이 통째로 빠지지 않게 자른다
    ...(원장.빠진자료.length > 0 ? { unread: 원장.빠진자료.map((이름) => 자르기(이름, 이름상한)) } : {}),
  };
}

function 보류tcId들(held: unknown): Set<string> {
  if (!Array.isArray(held)) return new Set();
  return new Set(held.filter(물건인가).map((h) => h.tcId).filter((t): t is string => typeof t === 'string'));
}

/**
 * 끝내기 몸에 셈을 싣는다. DONE 과 대조 뒤의 올리기 거절(STOPPED · REJECTED)에만 — 실패 · 다른 중단은 대조를 안 했거나 셈이 뜻이 없다.
 * 서버 검사에 걸릴 셈은 싣지 않고 남긴다 — 셈이 끝내기를 막으면 안 된다
 */
export function 커버리지실은몸(몸: Record<string, unknown>, 재료: 셈재료 | null): Record<string, unknown> {
  const 실을때 = 몸.status === 'DONE' || (몸.status === 'STOPPED' && 몸.stopReason === 'REJECTED');
  if (재료 === null || !실을때) return 몸;
  const 결과 = 물건인가(몸.result) ? 몸.result : {};
  const 보류 = 몸.status !== 'DONE' || 결과.heldUnknown === true ? null : 보류tcId들(결과.held);
  const 셈 = 커버리지만들기(재료, 보류);
  if (커버리지모양검사(셈) === null) {
    console.error('[작성] 셈이 서버 모양 검사에 안 맞아 싣지 않는다 — PR 본문 머리의 셈 줄은 그대로다');
    return 몸;
  }
  if (Buffer.byteLength(JSON.stringify(셈)) > 셈글상한) {
    console.error('[작성] 셈이 너무 커 싣지 않는다 — PR 본문 머리의 셈 줄은 그대로다');
    return 몸;
  }
  return { ...몸, result: { ...결과, coverage: 셈 } };
}

/** 끝낼 때의 재료를 읽어 싣는 손. 보류를 싣는 손 **안쪽**에 둔다 — 그래야 result.held 를 보고 보류를 센다 */
export function 커버리지싣는손(손: 보고손, 재료: () => 셈재료 | null): 보고손 {
  return { ...손, 끝내기: (몸) => 손.끝내기(커버리지실은몸(몸, 재료())) };
}
