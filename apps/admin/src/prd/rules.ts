// 표준 기획서 새 판을 짓는 규칙 — 본문 검사 · 번호 매기기 · checkSince · byPerson · 옮기기 합치기 · 반영 안 됨 (도메인/작성 §7 「표준 기획서 통로」)
// DB 없이 도는 순수 함수만 둔다. 잠금 · 넣기는 store.ts 가 한다

import type { PrdBasis, PrdItem, PrdStatus } from '@platform/kit';

// 상한의 정본은 도메인/작성 §7 「표준 기획서 통로」 「상한」 줄이다. 999 는 tcId 와 같은 번호 상한이다
export const 상한 = { 항목: 999, 기능묶음: 100, 요구문장: 1000, 근거: 10, 근거자리: 200, 근거문장: 2000 } as const;
export const 본문상한 = 4 * 1024 * 1024;

/** 보낸 항목. 번호가 없으면 새 항목이다 — checkSince · byPerson 은 서버가 매기므로 받지 않는다 */
export type 들어온항목 = Omit<PrdItem, 'reqId' | 'checkSince' | 'byPerson'> & { reqId?: string };

export interface 앞판 {
  version: number;
  items: PrdItem[];
  lastNo: number;
}

export type 판짓기오류 = { error: 'BAD_PRD' | 'PRD_REUSED' | 'PRD_FULL' | 'BAD_CONFIRM'; detail: string };

const 상태들: readonly PrdStatus[] = ['CONFIRMED', 'NEEDS_CHECK'];

function 글자(값: unknown, 최대: number): string | null {
  return typeof 값 === 'string' && 값.trim() !== '' && 값.length <= 최대 ? 값 : null;
}

function 번호꼴(접두사: string): RegExp {
  return new RegExp(`^${접두사}-REQ-(\\d{3})$`);
}

export function 번호수(reqId: string): number {
  return Number(reqId.slice(-3));
}

/** 본문 items 를 읽는다. 어긋나면 detail 에 `<자리>.<칸>` 을 싣는다 — 화면이 어느 항목인지 짚게 */
export function 항목검사(값: unknown, 접두사: string): { items: 들어온항목[] } | 판짓기오류 {
  if (!Array.isArray(값)) return { error: 'BAD_PRD', detail: 'items' };
  if (값.length > 상한.항목) return { error: 'PRD_FULL', detail: String(값.length) };
  const 꼴 = 번호꼴(접두사);
  const 본번호 = new Set<string>();
  const items: 들어온항목[] = [];
  for (const [i, 항목] of 값.entries()) {
    const 틀림 = (칸: string): 판짓기오류 => ({ error: 'BAD_PRD', detail: `${String(i)}.${칸}` });
    if (typeof 항목 !== 'object' || 항목 === null) return 틀림('');
    const x = 항목 as Record<string, unknown>;
    // 번호가 없거나 null 이면 새 항목이다 — 화면 폼은 빈 번호를 null 로 보내기 쉽다
    if (x.reqId !== undefined && x.reqId !== null) {
      if (typeof x.reqId !== 'string' || !꼴.test(x.reqId) || 번호수(x.reqId) === 0) return 틀림('reqId');
      if (본번호.has(x.reqId)) return 틀림('reqId');
      본번호.add(x.reqId);
    }
    const feature = 글자(x.feature, 상한.기능묶음);
    if (feature === null) return 틀림('feature');
    const text = 글자(x.text, 상한.요구문장);
    if (text === null) return 틀림('text');
    if (!상태들.includes(x.status as PrdStatus)) return 틀림('status');
    if (!Array.isArray(x.basis) || x.basis.length === 0 || x.basis.length > 상한.근거) return 틀림('basis');
    const basis: PrdBasis[] = [];
    for (const [j, 근거] of x.basis.entries()) {
      const b = (typeof 근거 === 'object' && 근거 !== null ? 근거 : {}) as Record<string, unknown>;
      const from = 글자(b.from, 상한.근거자리);
      const quote = 글자(b.quote, 상한.근거문장);
      const ref = b.ref === undefined ? undefined : 글자(b.ref, 상한.근거자리);
      if (from === null || quote === null || ref === null) return 틀림(`basis.${String(j)}`);
      basis.push(ref === undefined ? { from, quote } : { from, ref, quote });
    }
    items.push({
      ...(typeof x.reqId === 'string' ? { reqId: x.reqId } : {}),
      feature,
      text,
      basis,
      status: x.status as PrdStatus,
    });
  }
  return { items };
}

// JSON 글자로 견주지 않는다 — JSONB 는 키 차례를 바꿔 저장해서 DB 에서 읽은 같은 근거가 다른 글자가 된다
function 근거같나(a: PrdBasis[], b: PrdBasis[]): boolean {
  return a.length === b.length && a.every((x, i) => x.from === b[i]!.from && x.ref === b[i]!.ref && x.quote === b[i]!.quote);
}

/** 사람이 보는 칸 넷(번호 빼고)이 같은가. byPerson · checkSince 는 견주지 않는다 */
function 내용같나(a: 들어온항목 | PrdItem, b: PrdItem): boolean {
  return a.feature === b.feature && a.text === b.text && a.status === b.status && 근거같나(a.basis, b.basis);
}

/** 판 통째가 같은가 — 같으면 새 판을 안 만든다(옮기기를 다시 돌릴 때마다 같은 판이 쌓이지 않게) */
export function 판같나(a: PrdItem[], b: PrdItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => {
      const y = b[i]!;
      return x.reqId === y.reqId && 내용같나(x, y) && x.checkSince === y.checkSince && x.byPerson === y.byPerson;
    })
  );
}

/**
 * 앞 판에 견줘 서버가 매기는 표시를 단다.
 * checkSince — 확인 필요로 바뀌면 이번 시각, 계속 확인 필요면 앞 판 값. byPerson — 사람이 바꿨으면 true, 안 바꿨으면 앞 판 값
 */
function 표시달기(항목: 들어온항목 & { reqId: string }, 앞것: PrdItem | undefined, 지금: string, 사람: boolean): PrdItem {
  const 결과: PrdItem = {
    reqId: 항목.reqId,
    feature: 항목.feature,
    text: 항목.text,
    basis: 항목.basis,
    status: 항목.status,
  };
  if (항목.status === 'NEEDS_CHECK') {
    결과.checkSince = 앞것?.status === 'NEEDS_CHECK' && 앞것.checkSince !== undefined ? 앞것.checkSince : 지금;
  }
  // 옮기기 항목은 사람 것을 앞에서 걸러 내 여기 오지 않는다 — 옮기기가 만든 항목에는 byPerson 을 안 단다
  if (사람 && (앞것 === undefined || !내용같나(항목, 앞것) || 앞것.byPerson === true)) 결과.byPerson = true;
  return 결과;
}

function 새번호주기(
  items: 들어온항목[],
  lastNo: number,
  접두사: string,
): { items: (들어온항목 & { reqId: string })[]; lastNo: number } | 판짓기오류 {
  let 마지막 = lastNo;
  const 결과: (들어온항목 & { reqId: string })[] = [];
  for (const 항목 of items) {
    if (항목.reqId !== undefined) {
      결과.push({ ...항목, reqId: 항목.reqId });
      continue;
    }
    마지막 += 1;
    // 999 를 넘는 번호는 주지 않는다 — 사람이 정한다(tcId 상한과 같다)
    if (마지막 > 상한.항목) return { error: 'PRD_FULL', detail: String(마지막) };
    결과.push({ ...항목, reqId: `${접두사}-REQ-${String(마지막).padStart(3, '0')}` });
  }
  return { items: 결과, lastNo: 마지막 };
}

const 번호차례 = (a: PrdItem, b: PrdItem) => 번호수(a.reqId) - 번호수(b.reqId);

/**
 * 사람이 저장한 새 판(PUT · 되돌리기). 지금 판에 없는 번호는 PRD_REUSED — 고정 번호가 다른 요구에 붙지 않게.
 * 되돌리기는 옛 판에 있던 번호라 지금 판에 없어도 받는다(`옛번호` — 그 판의 같은 요구를 되살리는 것이다)
 */
export function 사람판(
  앞: 앞판 | null,
  보낸것: 들어온항목[],
  접두사: string,
  지금: string,
  옛번호: ReadonlySet<string> = new Set(),
): { items: PrdItem[]; lastNo: number } | 판짓기오류 {
  const 앞것들 = new Map((앞?.items ?? []).map((x) => [x.reqId, x]));
  for (const 항목 of 보낸것) {
    if (항목.reqId !== undefined && !앞것들.has(항목.reqId) && !옛번호.has(항목.reqId)) {
      return { error: 'PRD_REUSED', detail: 항목.reqId };
    }
  }
  const 매김 = 새번호주기(보낸것, 앞?.lastNo ?? 0, 접두사);
  if ('error' in 매김) return 매김;
  const items = 매김.items.map((x) => 표시달기(x, 앞것들.get(x.reqId), 지금, true)).sort(번호차례);
  return { items, lastNo: 매김.lastNo };
}

/** 일괄 확정. 확인 필요가 아닌 번호가 섞이면 BAD_CONFIRM — 확정한 항목은 checkSince 를 빼고 byPerson 을 단다 */
export function 확정판(앞: 앞판 | null, 번호들: unknown): { items: PrdItem[]; lastNo: number } | 판짓기오류 {
  if (!Array.isArray(번호들) || 번호들.length === 0) return { error: 'BAD_CONFIRM', detail: '' };
  const 고를것 = new Set<string>();
  const 앞것들 = new Map((앞?.items ?? []).map((x) => [x.reqId, x]));
  for (const 번호 of 번호들) {
    if (typeof 번호 !== 'string' || 앞것들.get(번호)?.status !== 'NEEDS_CHECK') {
      return { error: 'BAD_CONFIRM', detail: String(번호) };
    }
    고를것.add(번호);
  }
  const items = (앞?.items ?? []).map((x): PrdItem => {
    if (!고를것.has(x.reqId)) return x;
    const { checkSince: _뺌, ...나머지 } = x;
    return { ...나머지, status: 'CONFIRMED', byPerson: true };
  });
  return { items, lastNo: 앞?.lastNo ?? 0 };
}

/**
 * 옮기기(에이전트)가 올린 새 판. 거절하지 않고 합친다 —
 * 지금 판에서 사람이 고친 항목(byPerson)은 사람 것을 남기고, 받은 판 뒤에 사람이 지운 번호는 되살리지 않는다.
 * 둘 다 문서와 달랐던 번호를 keptByPerson 으로 돌려준다 — PR 본문 머리에 실린다
 */
export function 옮기기판(
  받은판: 앞판 | null,
  지금판: 앞판 | null,
  보낸것: 들어온항목[],
  접두사: string,
  지금: string,
): { items: PrdItem[]; lastNo: number; keptByPerson: string[] } | 판짓기오류 {
  const 받은것들 = new Map((받은판?.items ?? []).map((x) => [x.reqId, x]));
  const 지금것들 = new Map((지금판?.items ?? []).map((x) => [x.reqId, x]));
  const 남김 = new Set<string>();
  const 쓸것: 들어온항목[] = [];
  for (const 항목 of 보낸것) {
    if (항목.reqId === undefined) {
      쓸것.push(항목);
      continue;
    }
    const 사람것 = 지금것들.get(항목.reqId);
    if (사람것 === undefined) {
      if (!받은것들.has(항목.reqId)) return { error: 'PRD_REUSED', detail: 항목.reqId };
      남김.add(항목.reqId); // 받은 판 뒤에 사람이 지웠다
      continue;
    }
    if (사람것.byPerson === true) {
      if (!내용같나(항목, 사람것)) 남김.add(항목.reqId);
      continue;
    }
    쓸것.push(항목);
  }
  const 보낸번호 = new Set(보낸것.flatMap((x) => (x.reqId === undefined ? [] : [x.reqId])));
  const 사람것들 = [...지금것들.values()].filter((x) => x.byPerson === true);
  for (const x of 사람것들) if (!보낸번호.has(x.reqId) && 받은것들.has(x.reqId)) 남김.add(x.reqId); // 문서에서 빠졌는데 사람이 고친 것
  const 매김 = 새번호주기(쓸것, 지금판?.lastNo ?? 0, 접두사);
  if ('error' in 매김) return 매김;
  const 새것 = 매김.items.map((x) => 표시달기(x, 지금것들.get(x.reqId), 지금, false));
  const items = [...새것, ...사람것들].sort(번호차례);
  return { items, lastNo: 매김.lastNo, keptByPerson: [...남김].sort() };
}

/** 「반영 안 됨」 — 요구 문장이 바뀌었거나 더하거나 지운 번호. 상태만 바뀐 것은 코드가 안 바뀌어 안 센다. 기준이 없으면 전부 더한 것이다 */
export function 반영안됨(
  기준: PrdItem[] | null,
  지금: PrdItem[],
): { changed: string[]; added: string[]; removed: string[] } {
  const 옛것 = new Map((기준 ?? []).map((x) => [x.reqId, x.text]));
  const 새것 = new Set(지금.map((x) => x.reqId));
  return {
    changed: 지금.filter((x) => 옛것.has(x.reqId) && 옛것.get(x.reqId) !== x.text).map((x) => x.reqId),
    added: 지금.filter((x) => !옛것.has(x.reqId)).map((x) => x.reqId),
    removed: [...옛것.keys()].filter((번호) => !새것.has(번호)),
  };
}

/** 「확인 필요 N건 · 가장 오래된 것 N일째」의 재료 */
export function 확인필요(items: PrdItem[]): { count: number; oldestSince: string | null } {
  const 시각들 = items.filter((x) => x.status === 'NEEDS_CHECK').map((x) => x.checkSince ?? '');
  const 있는것 = 시각들.filter((t) => t !== '').sort();
  return { count: 시각들.length, oldestSince: 있는것[0] ?? null };
}
