// 작성 목록 줄 · 상세 머리의 summary — 종류 · 무슨 테스트 · 결과 · 시작한 곳을 뿌리 여러 개에 한 번에 계산한다 (도메인/작성 §3.6 「작성 목록 줄」 · §7 「목록 줄 summary」)

import type { PrdItem } from '@platform/kit';

import { API서비스인가 } from './apiDoc.js';
import { 행케이스 } from './cases.js';
import { 사슬식 } from './chainSql.js';
import { 행커버리지 } from './coverage.js';
import { 행의고칠것 } from './edit.js';
import { 보류들 } from './held.js';
import { 결정수, 밖화면뿌리 } from './params.js';
import { 기준판 } from '../prd/store.js';
import { 반영안됨, 화면번호들, 화면칸들 } from '../prd/rules.js';
import { db } from './store.js';

export type 요약종류 = 'PRD' | 'API_DOC' | 'UNCOVERED' | 'SCREEN_ONLY' | 'CONTINUE' | 'PRD_APPLY' | 'API_APPLY' | 'DECISION' | 'EDIT';

export interface 목록요약 {
  kind: 요약종류;
  what: {
    features: string[];
    featuresMore: number;
    screens: string[];
    screensMore: number;
    reqs: number;
    screenRight: number;
    tcIds: string[];
    tcMore: number;
    // 케이스 고치기의 고친 것 — 모두 기대값이면 EXPECTED, 모두 지우기면 DELETE, 섞였거나 고치기가 아니면 null
    fix: 'EXPECTED' | 'DELETE' | null;
  };
  result: {
    casesMade: number | null;
    casesFixed: number | null;
    reqsCovered: number | null;
    reqsTotal: number | null;
    held: number | null;
    stoppedAt: string | null;
  } | null;
  from: {
    by: 'PERSON' | 'AUTO' | 'PRD' | 'CASES' | 'DECISION';
    after: number | null;
    decisions: number | null;
    assets: { name: string; figma: boolean }[];
    assetsMore: number;
  };
}

const 보일수 = 3;
const 자료수 = 5;

interface 줄 {
  root_id: string;
  root_kind: string;
  root_params: Record<string, unknown>;
  continue_from: string | null;
  compare: boolean;
  status: string | null;
  stage: string | null;
  result: unknown;
  prd_version: number | null;
  started_at: Date | null;
  asset_n: string;
  assets: { name: string; figma: boolean }[];
}

/** 많은 차례로 셋과 나머지 수. 같으면 처음 나온 차례 — Map 은 넣은 차례를 지킨다 */
function 많은차례(셈: Map<string, number>): { 위: string[]; 더: number } {
  const 줄들 = [...셈.entries()].sort((a, b) => b[1] - a[1]);
  return { 위: 줄들.slice(0, 보일수).map(([k]) => k), 더: Math.max(0, 줄들.length - 보일수) };
}

function 종류(x: 줄, api: boolean): 요약종류 {
  const p = x.root_params;
  if (x.root_kind === 'EDIT') return 'EDIT';
  if (p.prdApply === true) return 결정수(p.decision) === null ? 'PRD_APPLY' : 'DECISION';
  if (p.apiApply !== undefined) return 'API_APPLY';
  if (밖화면뿌리(p.uncoveredOf) !== null) return 'UNCOVERED';
  if (x.continue_from !== null) return 'CONTINUE';
  if (api) return 'API_DOC';
  if (x.compare && Number(x.asset_n) === 0) return 'SCREEN_ONLY';
  return 'PRD';
}

function 시작한곳(x: 줄, kind: 요약종류): 목록요약['from'] {
  const 결정 = 결정수(x.root_params.decision);
  const by = 결정 !== null ? 'DECISION' : kind === 'UNCOVERED' ? 'AUTO' : kind === 'EDIT' ? 'CASES' : kind === 'PRD_APPLY' ? 'PRD' : 'PERSON';
  const after = kind === 'UNCOVERED' ? 밖화면뿌리(x.root_params.uncoveredOf) : kind === 'CONTINUE' ? Number(x.continue_from) : null;
  return { by, after, decisions: 결정, assets: x.assets, assetsMore: Math.max(0, Number(x.asset_n) - 자료수) };
}

function 결과(x: 줄, kind: 요약종류, 고칠것: unknown[] | null): 목록요약['result'] {
  if (x.status !== 'DONE' && x.status !== 'FAILED' && x.status !== 'STOPPED') return null;
  const 케이스 = 행케이스(x.result);
  const 셈 = 행커버리지(x.result);
  const 원장 = 셈 === null || 'none' in 셈 ? null : 셈;
  const 고침 = kind === 'EDIT' ? (x.status === 'DONE' ? (고칠것?.length ?? 0) : null) : (케이스?.filter((c) => c.change === 'CHANGED').length ?? null);
  return {
    casesMade: kind === 'EDIT' ? null : (케이스?.filter((c) => c.change === 'NEW').length ?? null),
    casesFixed: 고침,
    reqsCovered: 원장?.cased ?? null,
    reqsTotal: 원장?.total ?? null,
    held: x.status === 'DONE' ? 보류들(x.result).length : null,
    // 단계 글이 없으면(집자마자 멈춤) 첫 칸이다 — 화면이 단계 글을 칸 이름으로 옮긴다
    stoppedAt: x.status === 'DONE' ? null : (x.stage ?? '준비'),
  };
}

/**
 * 뿌리마다 summary. 재료는 뿌리 행(종류 · params · 자료)과 **머지를 뺀 최신 작성 실행**(셈 · 만든 케이스 · 읽은 판 · 단계)이다.
 * 기능 묶음 · 화면 이름은 그 실행이 만든 케이스에 달린 요구에서 센다 — 셈(coverage)에는 덮은 요구 번호 목록이 없다(2026-10-26 WEB-F6-06 시작 질문)
 */
export async function 목록요약들(서비스: number, 뿌리들: number[]): Promise<Map<number, 목록요약>> {
  if (뿌리들.length === 0) return new Map();
  const pool = await db();
  const [r, api] = await Promise.all([
    pool.query<줄>(
      `WITH RECURSIVE ${사슬식('id = ANY($1::bigint[])')},
       작성 AS (
         SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, a.status, a.stage, a.result, a.prd_version, a.started_at
           FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
          WHERE a.kind <> 'MERGE'
          ORDER BY 사슬.root_id, a.id DESC
       )
       SELECT r.id AS root_id, r.kind AS root_kind, r.params AS root_params, r.continue_from, r.compare,
              작성.status, 작성.stage, 작성.result, 작성.prd_version, 작성.started_at,
              (SELECT count(*) FROM authoring_asset s WHERE s.request_id = r.id AND s.role = 'INPUT') AS asset_n,
              (SELECT COALESCE(json_agg(json_build_object('name', y.name, 'figma', y.kind = 'FIGMA') ORDER BY y.position), '[]'::json)
                 FROM (SELECT name, kind, position FROM authoring_asset s
                        WHERE s.request_id = r.id AND s.role = 'INPUT' ORDER BY position LIMIT ${자료수}) y) AS assets
         FROM authoring_request r LEFT JOIN 작성 ON 작성.root_id = r.id
        WHERE r.id = ANY($1::bigint[])`,
      [뿌리들],
    ),
    API서비스인가(서비스),
  ]);

  const 판번호들 = [...new Set(r.rows.map((x) => x.prd_version).filter((v): v is number => v !== null))];
  const 판들 = new Map<number, PrdItem[]>();
  if (판번호들.length > 0) {
    const v = await pool.query<{ version: number; items: PrdItem[] }>(
      'SELECT version, items FROM prd_version WHERE service_id = $1 AND version = ANY($2::int[])',
      [서비스, 판번호들],
    );
    for (const x of v.rows) 판들.set(x.version, x.items);
  }

  const 종류들 = new Map(r.rows.map((x) => [x.root_id, 종류(x, api)]));
  // 화면 근거 주소 → 화면 기록 이름. 기획서에 없는 화면 · 화면만 줄만 쓴다
  const 화면주소들 = new Map<string, Map<string, number>>();
  for (const x of r.rows) {
    const kind = 종류들.get(x.root_id)!;
    if (kind !== 'UNCOVERED' && kind !== 'SCREEN_ONLY') continue;
    const 셈 = new Map<string, number>();
    for (const item of 요구들(x, 판들)) {
      for (const 주소 of new Set(item.basis.filter((b) => b.from === '화면' && b.ref !== undefined).map((b) => b.ref!))) 셈.set(주소, (셈.get(주소) ?? 0) + 1);
    }
    화면주소들.set(x.root_id, 셈);
  }
  const 모든주소 = [...new Set([...화면주소들.values()].flatMap((m) => [...m.keys()]))];
  const 화면이름 = new Map<string, string>();
  if (모든주소.length > 0) {
    const s = await pool.query<{ url: string; name: string }>(
      'SELECT DISTINCT ON (url) url, name FROM screen_record WHERE service_id = $1 AND url = ANY($2::text[]) ORDER BY url, state',
      [서비스, 모든주소],
    );
    for (const x of s.rows) 화면이름.set(x.url, x.name);
  }

  const 바뀐요구 = new Map(
    await Promise.all(
      r.rows
        .filter((x) => { const k = 종류들.get(x.root_id); return k === 'PRD_APPLY' || k === 'DECISION'; })
        .map(async (x) => [x.root_id, await 바뀐요구수(서비스, x, 판들)] as const),
    ),
  );
  const 결과표 = new Map<number, 목록요약>();
  for (const x of r.rows) {
    const kind = 종류들.get(x.root_id)!;
    const 기능셈 = new Map<string, number>();
    for (const item of 요구들(x, 판들)) 기능셈.set(item.feature, (기능셈.get(item.feature) ?? 0) + 1);
    const 기능 = 많은차례(기능셈);
    const 화면셈 = new Map<string, number>();
    for (const [주소, n] of 화면주소들.get(x.root_id) ?? []) {
      const 이름 = 화면이름.get(주소) ?? 주소;
      화면셈.set(이름, (화면셈.get(이름) ?? 0) + n);
    }
    const 화면 = 많은차례(화면셈);
    const 고칠것 = kind === 'EDIT' ? 행의고칠것(x.root_params) : null;
    const tcIds = (고칠것 ?? []).map((e) => (e as { tcId: string }).tcId);
    const 지우기수 = (고칠것 ?? []).filter((e) => (e as { delete?: unknown }).delete === true).length;
    결과표.set(Number(x.root_id), {
      kind,
      what: {
        features: 기능.위,
        featuresMore: 기능.더,
        screens: 화면.위,
        screensMore: 화면.더,
        reqs: 바뀐요구.get(x.root_id) ?? 0,
        screenRight: 화면칸들(x.root_params).length,
        tcIds: tcIds.slice(0, 보일수),
        tcMore: Math.max(0, tcIds.length - 보일수),
        fix: 고칠것 === null || 고칠것.length === 0 ? null : 지우기수 === 고칠것.length ? 'DELETE' : 지우기수 === 0 ? 'EXPECTED' : null,
      },
      result: 결과(x, kind, 고칠것),
      from: 시작한곳(x, kind),
    });
  }
  return 결과표;
}

/** 그 실행이 만든 케이스에 달린 요구 — 그 실행이 읽은 판의 항목으로. 셈 · 판이 없으면 빈 목록 */
function 요구들(x: 줄, 판들: Map<number, PrdItem[]>): PrdItem[] {
  const 케이스 = 행케이스(x.result);
  const 항목들 = x.prd_version === null ? undefined : 판들.get(x.prd_version);
  if (케이스 === null || 항목들 === undefined) return [];
  const 번호들 = new Set(케이스.flatMap((c) => c.reqs));
  return 항목들.filter((item) => 번호들.has(item.reqId));
}

/**
 * 반영 요청이 다시 쓴 요구 수 — 그 실행이 읽은 판을 그 실행이 시작하기 직전의 기준 판과 견준 바뀜 · 새 항목(지움은 쓸 테스트가 없다).
 * 화면이 맞음 번호는 따로 센다 — 옮기기가 그 번호를 고친 판으로 읽은 판을 바꾸기 때문이다. 아직 안 집혔으면 모른다(0)
 */
async function 바뀐요구수(서비스: number, x: 줄, 판들: Map<number, PrdItem[]>): Promise<number> {
  const 항목들 = x.prd_version === null ? undefined : 판들.get(x.prd_version);
  if (항목들 === undefined || x.started_at === null) return 0;
  // ponytail: 반영 줄마다 질의 하나(동시에) — 한 쪽에 반영 요청이 몇 줄뿐이다. 많아지면 시각별로 묶어 한 번에 읽는다
  const 기준 = await 기준판(서비스, x.started_at);
  const 차이 = 반영안됨(기준?.items ?? null, 항목들);
  const 화면 = 화면번호들(x.root_params);
  return new Set([...차이.changed, ...차이.added].filter((번호) => !화면.has(번호))).size;
}
