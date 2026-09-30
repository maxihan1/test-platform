// 작성 실행의 셈(result.coverage) — 모양 검사 · 칸 다섯으로 옮기기 · 상세에 싣기 (SPEC 도메인/작성 §3.6 「★ 원장」 · §7 finish)
// DB · 서버 틀을 import 하지 않는다 — 작성 에이전트가 보내기 전에 같은 검사를 돌리려고 가져다 쓴다(scripts/authoring-coverage.ts)

export interface 원장셈 {
  total: number;
  cased: number;
  held: number | null;
  excluded: Record<string, number>;
  missing: string[];
  later: string[];
  unread?: string[];
}
export type 커버리지 = 원장셈 | { none: string };

export interface 셈칸 {
  total: number | null;
  cased: number | null;
  held: number | null;
  excluded: number | null;
  missing: number | null;
}

const 셈키 = ['total', 'cased', 'held', 'excluded', 'missing', 'later', 'unread'];
const 필수키 = ['total', 'cased', 'held', 'excluded', 'missing', 'later'];
// 종류 이름 목록은 여기 옮겨 적지 않는다 — 정본은 scripts/authoring-ledger-check.ts 의 제외종류다. 둘을 두면 한쪽이 뒤처진다
const 종류이름상한 = 20;
const 종류수상한 = 10;
const 글상한 = 200;
const 까닭상한 = 500;

const 객체인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
// 칸이 INTEGER 라 그 위는 넣을 때 500 이다 — 에이전트는 5xx 를 몇 분 동안 다시 보내므로 여기서 400 으로 끊는다
const 정수상한 = 2 ** 31 - 1;
const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 정수상한;
const 글목록인가 = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 글상한);

/**
 * 에이전트가 보낸 셈을 본다. 틀리면 null — 끝내기가 400 BAD_COVERAGE 를 낸다.
 * 개수 상한은 두지 않는다 — 원장 크기에 상한이 없어 정상 셈이 걸리면 에이전트가 셈을 빼고 다시 보내야 한다(본문 크기 상한이 막는다)
 */
export function 커버리지모양검사(v: unknown): 커버리지 | null {
  if (!객체인가(v)) return null;
  if ('none' in v) {
    const 까닭 = v.none;
    const 하나뿐 = Object.keys(v).length === 1;
    return 하나뿐 && typeof 까닭 === 'string' && 까닭.length > 0 && 까닭.length <= 까닭상한 ? { none: 까닭 } : null;
  }
  if (Object.keys(v).some((k) => !셈키.includes(k)) || 필수키.some((k) => !(k in v))) return null;
  const { total, cased, held, excluded, missing, later, unread } = v;
  if (!수인가(total) || !수인가(cased) || (held !== null && !수인가(held))) return null;
  if (!객체인가(excluded)) return null;
  const 종류들 = Object.entries(excluded);
  if (종류들.length > 종류수상한) return null;
  if (종류들.some(([k, n]) => k.length === 0 || k.length > 종류이름상한 || !수인가(n))) return null;
  if (!글목록인가(missing) || !글목록인가(later) || (unread !== undefined && !글목록인가(unread))) return null;
  const 제외수 = 종류들.reduce((a, [, n]) => a + (n as number), 0);
  if (cased + 제외수 + missing.length !== total) return null;
  if (held !== null && held > cased) return null;
  if (later.length > 제외수) return null;
  return v as unknown as 원장셈;
}

/** 칸 다섯으로 옮긴다. 원장 없음 · 셈 없음은 전부 비운다 — 0 으로 채우면 「요구 0개」로 읽힌다 */
export function 커버리지칸(c: 커버리지 | null): 셈칸 {
  if (c === null || 'none' in c) return { total: null, cased: null, held: null, excluded: null, missing: null };
  const 제외수 = Object.values(c.excluded).reduce((a, n) => a + n, 0);
  return { total: c.total, cased: c.cased, held: c.held, excluded: 제외수, missing: c.missing.length };
}

/** 상세가 싣는 셈 — 저장된 result 를 읽을 때도 다시 본다. 셈이 없거나 모양이 틀린 옛 행은 null */
export function 행커버리지(result: unknown): 커버리지 | null {
  return 객체인가(result) ? 커버리지모양검사(result.coverage) : null;
}
