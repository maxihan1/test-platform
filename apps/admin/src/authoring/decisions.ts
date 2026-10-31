// 결정 목록 — 사람이 고를 일을 묶음 셋으로 모아 부른 사람이 고를 수 있는 값을 단다 (도메인/작성 §3.6 「★ 결정 목록」 · §7 「결정 목록 통로」 GET)

import type { PrdItem } from '@platform/kit';

import { 판비교 } from '../apidoc/doc.js';
import { 문서설정읽기, 판원문 } from '../apidoc/store.js';
import { 초안카드들 } from '../bts/draftDecide.js';
import { BTS이은서비스인가 } from '../bts/link.js';
import { findItem } from '../execution/queries.js';
import { 지도를읽는다 } from '../prd/apiMap.js';
import { 찾은화면셈 } from '../prd/found.js';
import { 반영안됨 } from '../prd/rules.js';
import { 기준판, 지금판, 케이스지도 } from '../prd/store.js';
import { 목록 as 시나리오목록 } from '../scenario/store.js';
import {
  API요약이름,
  결정수세기,
  바뀐요구펴기,
  요약이름들,
  화면지문,
  확인갈래,
  type 결정목록,
  type 결정항목,
  type 고르기,
  type 막힘,
} from './decisionItems.js';
import { 기다리는요청들, 병합된API버전, 손남은뿌리들, 최근대조, 판정없는실패들 } from './decisionReads.js';
import { 목록요약들 } from './listSummary.js';
import { 열린작성 } from './openRoots.js';

/** 부른 사람이 그 애플리케이션에서 할 수 있는 것 — admin 은 배정된 애플리케이션에서 전부다(auth/gate.ts `권한이되나`) */
export interface 부른이 {
  admin: boolean;
  작성쓰기: boolean;
  실행읽기: boolean;
  실행쓰기: boolean;
}

const 실패상한 = 20;

const 고름 = (되나: boolean, picks: 고르기[], 까닭: 막힘) => (되나 ? { picks, blockedBy: null } : { picks: [] as 고르기[], blockedBy: 까닭 });

/** ① 반영 대기 · 상세에서 할 일 */
async function 첫묶음(서비스: number, 누구: 부른이): Promise<결정항목[]> {
  const [뿌리들, 기다림] = await Promise.all([손남은뿌리들(서비스), 기다리는요청들(서비스)]);
  const 요약 = await 목록요약들(서비스, 뿌리들.map((x) => x.rootId));
  const 대기: 결정항목[] = [];
  const 할일: 결정항목[] = [];
  for (const x of 뿌리들) {
    const 막힘 = x.할일 === 'FAILED' || x.heldOpen > 0 || x.heldUnknown;
    // PR 없이 끝난 작성은 올릴 것이 없다 — 보류 · 겹침 까닭으로 적지 않는다. 열린 작성(open)으로 남아 ③ 의 「#N 이 반영된 뒤에」가 그 요청을 가리킨다
    if (!막힘 && x.prUrl === null) continue;
    if (!막힘) {
      대기.push({
        key: `apply:${String(x.rootId)}:${String(x.runId)}`, group: 1, kind: 'APPLY', ...고름(누구.admin, ['APPLY'], 'ADMIN_ONLY'),
        rootId: x.rootId, runId: x.runId, summary: 요약.get(x.rootId)!, prUrl: x.prUrl, requestedByName: x.requestedByName, finishedAt: x.finishedAt,
      });
      continue;
    }
    const why = x.conflictsOpen > 0 ? 'CONFLICT' : x.할일 === 'FAILED' ? 'APPLY_FAILED' : 'HELD';
    할일.push({
      key: `fix:${String(x.rootId)}`, group: 1, kind: 'FIX', picks: [], blockedBy: null, rootId: x.rootId, summary: 요약.get(x.rootId)!, why,
      count: why === 'CONFLICT' ? x.conflictsOpen : why === 'HELD' ? x.heldOpen : 0,
      waiting: 기다림.filter((w) => w.after.includes(x.rootId)).map((w) => w.id),
    });
  }
  return [...대기, ...할일];
}

/**
 * ② 실패 판정 — 지금 판에 있는 요구를 덮는 실패만. 목록에는 최근 20건까지 싣고, 진행이 받을 열쇠(`전부`)는 다 둔다.
 * BTS 를 이은 프로젝트는 싣지 않는다 — 판정은 BTS 에서만 한다(도메인/BTS 「판정은 BTS 에서」)
 */
async function 실패묶음(서비스: number, 판: PrdItem[], 누구: 부른이, 상세: boolean): Promise<{ items: 결정항목[]; more: number; 전부: Map<string, 결정항목> }> {
  if (!누구.실행읽기) return { items: [], more: 0, 전부: new Map() };
  const [실패들, 지도, 이음] = await Promise.all([판정없는실패들(서비스), 케이스지도(서비스), BTS이은서비스인가(서비스)]);
  if (이음) return { items: [], more: 0, 전부: new Map() };
  const 덮는요구 = new Map<string, Set<string>>();
  for (const [reqId, 케이스들] of Object.entries(지도)) {
    for (const c of 케이스들) 덮는요구.set(c.tcId, (덮는요구.get(c.tcId) ?? new Set<string>()).add(reqId));
  }
  const 든것 = 실패들.flatMap((f) => {
    const 덮음 = 덮는요구.get(f.tcId);
    const reqs = 판.filter((x) => 덮음?.has(x.reqId) === true).map((x) => ({ reqId: x.reqId, text: x.text }));
    return reqs.length === 0 ? [] : [{ ...f, reqs }];
  });
  const 고를것 = 누구.작성쓰기
    ? { picks: (누구.실행쓰기 ? ['SCREEN', 'BUG'] : ['SCREEN']) as 고르기[], blockedBy: 누구.실행쓰기 ? null : ('NO_RUN_WRITE' as const) }
    : { picks: [] as 고르기[], blockedBy: 'NO_WRITE' as const };
  const 줄 = (f: (typeof 든것)[number], verify: string | null, reason: string | null): 결정항목 => ({
    key: `fail:${String(f.runId)}:${f.tcId}`, group: 2, kind: 'FAIL', ...고를것,
    runId: f.runId, tcId: f.tcId, reqs: f.reqs, verify, reason, finishedAt: f.finishedAt,
  });
  const items = await Promise.all(
    든것.slice(0, 실패상한).map(async (f) => {
      if (!상세) return 줄(f, null, null);
      // 확인 문장 · 실패 까닭은 항목 상세와 같은 함수로 가린 뒤 고른다 — 비밀값이 결정 목록으로 새지 않게
      const 항목 = await findItem(f.itemRunId, f.historyId);
      return 줄(f, 항목?.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL')?.statement ?? null, 항목?.failure?.reason ?? null);
    }),
  );
  const 전부 = new Map(든것.map((f, i) => [`fail:${String(f.runId)}:${f.tcId}`, items[i] ?? 줄(f, null, null)]));
  return { items, more: Math.max(0, 든것.length - 실패상한), 전부 };
}

/** ② 의 맨 앞 「PRD 초안」 카드 — 끝난 초안은 고르기 · 버리기, 실패 · 멈춘 초안은 다시 만들기 · 버리기 (도메인/BTS 「PRD 초안 → 결정 필요」) */
async function 초안묶음(서비스: number, 판: PrdItem[], 누구: 부른이): Promise<결정항목[]> {
  return (await 초안카드들(서비스, 판)).map((c) => ({
    key: `draft:${String(c.requestId)}`, group: 2, kind: 'PRD_DRAFT', ...고름(누구.작성쓰기, c.state === 'DONE' ? ['TAKE', 'DROP'] : ['RETRY', 'DROP'], 'NO_WRITE'), ...c,
  }));
}

/** ② 확인 필요 — 화면 기준 · 불일치 · 그 밖 차례, 그 안에서 오래 기다린 것부터 */
function 확인묶음(판: PrdItem[], 누구: 부른이): 결정항목[] {
  const 차례 = { SCREEN: 0, DOCS: 1, OTHER: 2 } as const;
  return 판
    .filter((x) => x.status === 'NEEDS_CHECK')
    .map((x) => ({ x, ...확인갈래(x) }))
    .sort((a, b) => 차례[a.basis] - 차례[b.basis] || (a.x.checkSince ?? '￿').localeCompare(b.x.checkSince ?? '￿') || a.x.reqId.localeCompare(b.x.reqId))
    .map(({ x, basis, options }): 결정항목 => ({
      key: `check:${x.reqId}`, group: 2, kind: 'CHECK', ...고름(누구.작성쓰기, basis === 'DOCS' ? ['PICK', 'OWN'] : ['SAME', 'EDIT'], 'NO_WRITE'),
      reqId: x.reqId, feature: x.feature, text: x.text, checkSince: x.checkSince ?? null, basis, options,
    }));
}

/**
 * ③ 의 고르기 — 열린 작성이 없을 때만. 열린 작성이 모두 ① 의 반영 대기이고 admin 이면 고르되 needsApply 를 단다(① 을 다 올려야 켠다)
 */
function 셋째고름(누구: 부른이, 열린: number[], 대기뿌리: Set<number>, picks: 고르기[]): Pick<결정항목, 'picks' | 'blockedBy' | 'needsApply'> {
  if (!누구.작성쓰기) return { picks: [], blockedBy: 'NO_WRITE' };
  if (열린.length === 0) return { picks, blockedBy: null };
  if (누구.admin && 열린.every((n) => 대기뿌리.has(n))) return { picks, blockedBy: null, needsApply: true };
  return { picks: [], blockedBy: 'AUTHORING_OPEN' };
}

async function 셋째묶음(서비스: number, 지금: { version: number; items: PrdItem[] }, 열린: number[], 대기뿌리: Set<number>, 누구: 부른이): Promise<결정항목[]> {
  const 판 = 지금.items;
  const 닫힘 = 열린.length > 0;
  const items: 결정항목[] = [];
  const [기준, 설정, 화면셈, 지도] = await Promise.all([기준판(서비스), 문서설정읽기(서비스), 찾은화면셈(서비스), 지도를읽는다(서비스)]);

  const 차이 = 반영안됨(기준?.items ?? null, 판);
  if (차이.changed.length + 차이.added.length + 차이.removed.length > 0) {
    const 편것 = 바뀐요구펴기(차이, 기준?.items ?? null, 판);
    items.push({
      key: `prd:${String(기준?.version ?? 0)}:${String(지금.version)}`, group: 3, kind: 'PRD_CHANGED',
      ...셋째고름(누구, 열린, 대기뿌리, ['REDO']),
      changed: 닫힘 ? null : 편것.changed, added: 닫힘 ? null : 편것.added, removed: 닫힘 ? null : 편것.removed,
      scenarios: 닫힘 || !누구.실행읽기 ? [] : await 쓰는시나리오(서비스, [...차이.changed, ...차이.removed]),
    });
  }

  const 지금문서 = 설정?.kind === 'API' ? await 판원문(서비스) : null;
  if (지금문서 !== null) {
    const from = await 병합된API버전(서비스);
    const 전문서 = from === null || from === 지금문서.version ? null : await 판원문(서비스, from);
    const 바뀜 = 전문서 === null ? [] : 판비교(전문서.doc, 지금문서.doc);
    // 없어진 API 뿐이면 다시 쓸 것이 없어 0 인 항목이다 — 그 케이스 지우기는 케이스 고치기다(도메인/API 「바뀐 API 만 다시 작성」)
    if (바뀜.some((c) => c.change !== 'REMOVED') && from !== null) {
      items.push({
        key: `api:${String(from)}:${String(지금문서.version)}`, group: 3, kind: 'API_CHANGED',
        ...셋째고름(누구, 열린, 대기뿌리, ['REDO']),
        fromVersion: from, toVersion: 지금문서.version,
        operations: 닫힘 ? null : 바뀜.map(({ method, path, change, breaking }) => ({ method, path, change, breaking })),
      });
    }
  }

  if (화면셈.uncoveredScreens.length > 0) {
    items.push({
      key: `screens:${화면지문(화면셈.uncoveredScreens)}`, group: 3, kind: 'SCREENS', ...셋째고름(누구, 열린, 대기뿌리, ['FIX']),
      screens: 닫힘 ? null : 화면셈.uncoveredScreens, env: (await 최근대조(서비스))?.env ?? null,
    });
  }

  const 안거친 = 지도.apis.filter((a) => a.cases.length === 0);
  if (안거친.length > 0) {
    const 이름들 = 지금문서 === null ? [] : 요약이름들(지금문서.doc);
    items.push({
      key: 'apis', group: 3, kind: 'APIS', picks: [], blockedBy: null,
      // 열린 작성이 있으면 그 테스트가 아직 안 올라와 셀 수 없다 — ③ 의 다른 항목과 같다(§3.6 「③ 은 열린 작성이 없을 때만」)
      apis: 닫힘 ? null : 안거친.map((a) => ({ method: a.method, path: a.path, name: API요약이름(이름들, a.method, a.path) })),
    });
  }
  return items;
}

/** 덮는 케이스를 쓰는 E2E 시나리오 — GET /api/scenarios?uses= 와 같은 셈(최신 버전 부품) */
async function 쓰는시나리오(서비스: number, reqIds: string[]): Promise<{ id: number; name: string }[]> {
  const 지도 = await 케이스지도(서비스);
  const 케이스 = new Set(reqIds.flatMap((r) => (지도[r] ?? []).map((c) => c.tcId)));
  if (케이스.size === 0) return [];
  return (await 시나리오목록(서비스))
    .filter((s) => s.parts.some((p) => p.kind === 'case' && 케이스.has(p.tcId)))
    .map((s) => ({ id: s.id, name: s.name }));
}

export async function 결정목록읽기(서비스: number, 누구: 부른이): Promise<결정목록> {
  return (await 결정재료읽기(서비스, 누구)).목록;
}

/**
 * 목록과 진행이 받을 실패 열쇠 전부(20건 상한 밖 포함) — 진행은 사람이 본 것과 같은 함수로 다시 짓고 견준다.
 * 진행은 실패의 확인 문장 · 까닭(`상세`)을 안 쓴다 — 항목 상세 20건을 또 읽지 않는다
 */
export async function 결정재료읽기(서비스: number, 누구: 부른이, 상세 = true): Promise<{ 목록: 결정목록; 실패: Map<string, 결정항목> }> {
  const [판, 열린] = await Promise.all([지금판(서비스), 열린작성(서비스)]);
  const items = 판?.items ?? [];
  const 첫 = await 첫묶음(서비스, 누구);
  const 대기뿌리 = new Set(첫.flatMap((x) => (x.kind === 'APPLY' ? [x.rootId] : [])));
  const [초안, 실패, 셋째] = await Promise.all([
    초안묶음(서비스, items, 누구),
    실패묶음(서비스, items, 누구, 상세),
    셋째묶음(서비스, { version: 판?.version ?? 0, items }, 열린, 대기뿌리, 누구),
  ]);
  const 모두 = [...첫, ...초안, ...실패.items, ...확인묶음(items, 누구), ...셋째];
  return { 목록: { prdVersion: 판?.version ?? 0, count: 결정수세기(모두, 실패.more), open: 열린, items: 모두, failMore: 실패.more }, 실패: 실패.전부 };
}
