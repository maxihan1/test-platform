// 표준 기획서 새 판을 짓는 규칙 — 본문 검사 · 번호 매기기 · checkSince · byPerson · 옮기기 합치기 · 반영 안 됨 (도메인/작성 §7 「표준 기획서 통로」)
// DB 없이 도는 순수 함수만 둔다. 잠금 · 넣기는 store.ts 가 한다

import type { PrdBasis, PrdItem, PrdStatus } from '@platform/kit';

// 상한의 정본은 도메인/작성 §7 「표준 기획서 통로」 「상한」 줄이다. 999 는 tcId 와 같은 번호 상한이다
export const 상한 = { 항목: 999, 기능묶음: 100, 요구문장: 1000, 근거: 10, 근거자리: 200, 근거문장: 2000 } as const;
export const 본문상한 = 4 * 1024 * 1024;

/** 직접 쓴 요구의 근거 — 쓴 사람이 곧 출처라 자료 이름은 고정 글자고 원본 문장은 요구 문장이다. 저장되는 글자라 화면 번역 표를 타지 않는다 */
export const 직접작성 = '직접 작성';
/** 화면에서 본 근거의 자료 이름. 작성 에이전트(`scripts/authoring-prd.ts`)가 적고 화면은 이 값으로 풀어 보인다 (kit `PrdBasis.from`) */
export const 화면에서 = '화면';
export const 직접근거 = (text: string): PrdBasis[] => [{ from: 직접작성, quote: text.slice(0, 상한.근거문장) }];

/** 화면 기록의 상태 「로그인:<역할>」에서 역할을 뽑는다. 「로그아웃」 같은 그 밖의 상태는 null (scripts/authoring-screens-keep.ts `상태`) */
export const 로그인역할 = (state: string): string | null => (state.startsWith('로그인:') ? state.slice('로그인:'.length) : null);

/** 보낸 항목. 번호가 없으면 새 항목이다 — checkSince · byPerson 은 서버가 매기므로 받지 않는다 */
export type 들어온항목 = Omit<PrdItem, 'reqId' | 'checkSince' | 'byPerson'> & { reqId?: string };

export interface 앞판 {
  version: number;
  items: PrdItem[];
  lastNo: number;
}

export type 판짓기오류 = { error: 'BAD_PRD' | 'PRD_REUSED' | 'PRD_FULL'; detail: string };

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

/**
 * 요구 자체(기능 묶음 · 요구 문장 · 근거)가 같은가 — 상태는 안 본다. 「화면이 맞음」 번호가 바뀌었나를 서버와 에이전트가 이것 하나로 가른다.
 * 상태를 빼는 까닭 — 화면 근거뿐인 항목은 에이전트가 확인 필요로 읽어 보내지만 서버가 확정으로 단다
 */
export function 요구같나(a: Pick<PrdItem, 'feature' | 'text' | 'basis'>, b: Pick<PrdItem, 'feature' | 'text' | 'basis'>): boolean {
  return a.feature === b.feature && a.text === b.text && 근거같나(a.basis, b.basis);
}

/** 사람이 보는 칸 넷(번호 빼고)이 같은가. byPerson · checkSince 는 견주지 않는다 */
function 내용같나(a: 들어온항목 | PrdItem, b: PrdItem): boolean {
  return a.status === b.status && 요구같나(a, b);
}

// params.screenRight 의 칸들 — 2026-10-13 PRD-F9-20 부터 목록이고 그 전 행은 한 칸 객체다
export function 화면칸들(params: Record<string, unknown>): { reqIds?: unknown; runId?: unknown; tcId?: unknown }[] {
  const s = params.screenRight;
  return (Array.isArray(s) ? s : s === undefined ? [] : [s]) as { reqIds?: unknown; runId?: unknown; tcId?: unknown }[];
}

/**
 * 작성 요청 params 의 「화면이 맞음」 번호(screenRight 칸마다의 reqIds 를 합친 것)와 그 번호를 덮은 실패 케이스(먼저 실린 칸). 화면이 맞음 요청이 아니면 빈 표.
 * 케이스는 버전 기록 「바뀐 것」의 까닭 「화면이 맞음(<tcId>)」에 쓴다 (작성 §7 「결정 목록 통로」 changes)
 */
export function 화면번호들(params: Record<string, unknown>): Map<string, string> {
  const 표 = new Map<string, string>();
  for (const 칸 of 화면칸들(params)) {
    if (!Array.isArray(칸?.reqIds)) continue;
    for (const 번호 of 칸.reqIds) if (typeof 번호 === 'string' && !표.has(번호)) 표.set(번호, typeof 칸.tcId === 'string' ? 칸.tcId : '');
  }
  return 표;
}

/**
 * 그 요청의 「화면이 맞음」 칸 · BTS 「테스트 문제」 칸(testFix.cases)에 실린 실행 · 케이스인가 — 에이전트가 받을 수 있는 실패 trace 는 이 짝뿐이다
 */
export function 화면이맞음건인가(params: Record<string, unknown>, runId: number, tcId: string): boolean {
  const 고침 = (params.testFix as { cases?: unknown } | undefined)?.cases;
  const 고침칸 = Array.isArray(고침) ? (고침 as ({ runId?: unknown; tcId?: unknown } | null)[]) : [];
  return [...화면칸들(params), ...고침칸].some((칸) => 칸?.runId === runId && 칸?.tcId === tcId);
}

/** 판 통째가 같은가 — 같으면 새 판을 안 만든다(옮기기를 다시 돌릴 때마다 같은 판이 쌓이지 않게) */
export function 판같나(a: PrdItem[], b: PrdItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((x, i) => {
      const y = b[i]!;
      return x.reqId === y.reqId && 내용같나(x, y) && x.checkSince === y.checkSince && x.byPerson === y.byPerson && (x.fromIssues ?? []).join() === (y.fromIssues ?? []).join();
    })
  );
}

/**
 * 앞 판에 견줘 서버가 매기는 표시를 단다.
 * checkSince — 확인 필요로 바뀌면 이번 시각, 계속 확인 필요면 앞 판 값. byPerson — 사람이 바꿨으면 true, 안 바꿨으면 앞 판 값
 */
function 표시달기(항목: 들어온항목 & { reqId: string }, 앞것: PrdItem | undefined, 지금: string, 사람: boolean, 되돌림 = false): PrdItem {
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
  // 어느 BTS 이슈에서 왔는지는 사람이 저장해도 남긴다 — 롤백이 이 꼬리표로 되돌릴 항목을 찾는다(도메인/BTS 「롤백 바퀴」).
  // 되돌리기는 되돌리는 판의 꼬리표를 쓴다 — 초안 전 판으로 되돌린 항목에 지금 판의 꼬리표가 남으면 롤백이 그 항목을 초안 것으로 본다
  const 꼬리 = 되돌림 ? 항목.fromIssues : 앞것?.fromIssues;
  if (꼬리 !== undefined) 결과.fromIssues = 꼬리;
  return 결과;
}

/** n 번째 요구 번호. 999 를 넘는 번호는 주지 않는다 — 사람이 정한다(tcId 상한과 같다). PRD 초안 카드도 이것으로 매긴다 */
export function 새번호(접두사: string, n: number): string | null {
  return n > 상한.항목 ? null : `${접두사}-REQ-${String(n).padStart(3, '0')}`;
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
    const reqId = 새번호(접두사, 마지막);
    if (reqId === null) return { error: 'PRD_FULL', detail: String(마지막) };
    결과.push({ ...항목, reqId });
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
  되돌림 = false,
): { items: PrdItem[]; lastNo: number } | 판짓기오류 {
  const 앞것들 = new Map((앞?.items ?? []).map((x) => [x.reqId, x]));
  for (const 항목 of 보낸것) {
    if (항목.reqId !== undefined && !앞것들.has(항목.reqId) && !옛번호.has(항목.reqId)) {
      return { error: 'PRD_REUSED', detail: 항목.reqId };
    }
  }
  const 매김 = 새번호주기(보낸것, 앞?.lastNo ?? 0, 접두사);
  if ('error' in 매김) return 매김;
  const items = 매김.items.map((x) => 표시달기(x, 앞것들.get(x.reqId), 지금, true, 되돌림)).sort(번호차례);
  return { items, lastNo: 매김.lastNo };
}

/**
 * 옮기기(에이전트)가 올린 새 판. 거절하지 않고 합친다 —
 * 지금 판에서 사람이 고친 항목(byPerson)은 사람 것을 남기고, 받은 판 뒤에 사람이 지운 번호는 되살리지 않는다.
 * 둘 다 문서와 달랐던 번호를 keptByPerson 으로 돌려준다 — PR 본문 머리에 실린다.
 * 「화면이 맞음」 번호(`화면번호`)는 다르다 — 지금 판과 요구가 달라졌으면 사람 것이어도 보낸 것을 확정 · byPerson 으로 쓰고,
 * 같으면 지금 판 그대로다. 사람이 화면이 맞다고 판정했으므로 keptByPerson 에 넣지 않는다 (§7 에이전트 `POST …/:id/prd`)
 */
export function 옮기기판(
  받은판: 앞판 | null,
  지금판: 앞판 | null,
  보낸것: 들어온항목[],
  접두사: string,
  지금: string,
  화면번호: Pick<ReadonlySet<string>, 'has'> = new Set(),
): { items: PrdItem[]; lastNo: number; keptByPerson: string[] } | 판짓기오류 {
  const 받은것들 = new Map((받은판?.items ?? []).map((x) => [x.reqId, x]));
  const 지금것들 = new Map((지금판?.items ?? []).map((x) => [x.reqId, x]));
  const 남김 = new Set<string>();
  const 쓸것: 들어온항목[] = [];
  const 화면것들: PrdItem[] = [];
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
    if (화면번호.has(항목.reqId)) {
      const { reqId, feature, text, basis } = 항목;
      // 받은 판과 같으면 에이전트가 안 고친 번호다 — 그 사이 사람이 고친 지금 것을 받은 판 사본으로 덮지 않는다
      const 받은것 = 받은것들.get(reqId);
      const 안고침 = 요구같나(항목, 사람것) || (받은것 !== undefined && 요구같나(항목, 받은것));
      화면것들.push(안고침 ? 사람것 : { reqId, feature, text, basis, status: 'CONFIRMED', byPerson: true });
      continue;
    }
    if (사람것.byPerson === true) {
      if (!내용같나(항목, 사람것)) 남김.add(항목.reqId);
      continue;
    }
    쓸것.push(항목);
  }
  const 보낸번호 = new Set(보낸것.flatMap((x) => (x.reqId === undefined ? [] : [x.reqId])));
  const 화면몫 = new Set(화면것들.map((x) => x.reqId));
  const 사람것들 = [...지금것들.values()].filter((x) => x.byPerson === true && !화면몫.has(x.reqId));
  for (const x of 사람것들) if (!보낸번호.has(x.reqId) && 받은것들.has(x.reqId) && !화면번호.has(x.reqId)) 남김.add(x.reqId); // 문서에서 빠졌는데 사람이 고친 것
  const 매김 = 새번호주기(쓸것, 지금판?.lastNo ?? 0, 접두사);
  if ('error' in 매김) return 매김;
  const 새것 = 매김.items.map((x) => 표시달기(x, 지금것들.get(x.reqId), 지금, false));
  const items = [...새것, ...사람것들, ...화면것들].sort(번호차례);
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
