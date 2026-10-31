// 결정 진행 — 고른 것을 한 번에 받아 버그 → 기획서 새 버전 → 반영 → 고치기 · 다시 만들기 → 보완 차례로 한 트랜잭션에서 세운다 (작성 §3.6 「★ 결정 목록」 진행 · §7 「결정 목록 통로」 POST)

import type { PoolClient } from 'pg';
import type { PrdItem } from '@platform/kit';

import { 다시작성넣기, 다시작성준비하기, type 다시작성준비 } from '../apidoc/rewrite.js';
import { 초안고름남기기, 초안다시만들기, 초안버리기, 초안적용, type 초안카드 } from '../bts/draftDecide.js';
import { BTS이은서비스인가 } from '../bts/link.js';
import type { 판변경 } from '../prd/changes.js';
import { 상한 } from '../prd/rules.js';
import { 화면목록식, 화면이맞음채우기, type 화면이맞음 } from '../prd/screenRight.js';
import { 결정판넣기, 서비스접두사, 잠그고, 지금판, type 저장하는사람 } from '../prd/store.js';
import { 버그남기기 } from '../reporting/failReqs.js';
import { 결정판, 요구문장, type 결정항목, type 확인결정 } from './decisionItems.js';
import { 최근대조 } from './decisionReads.js';
import { 결정재료읽기, type 부른이 } from './decisions.js';
import { 머지세우기 } from './merge.js';
import { 열린작성 } from './openRoots.js';
import { 역방향칸판정 } from './reverse.js';
import { 줄세우기, 한건 } from './store.js';

export interface 진행단계 {
  /** 6 은 「PRD 초안」 카드의 버리기 · 다시 만들기 — 다시 만들기만 requestId 가 찬다 */
  step: 1 | 2 | 3 | 4 | 5 | 6;
  key: string | null;
  requestId: number | null;
  version: number | null;
}

export type 진행결과 = { code: 201; body: { steps: 진행단계[] } } | { code: 400 | 403 | 409; body: Record<string, unknown> };

const 낡음: 진행결과 = { code: 409, body: { error: 'DECISIONS_STALE' } };
const 틀림 = (key: string): 진행결과 => ({ code: 400, body: { error: 'BAD_PICK', detail: key } });
const 권한없음 = (need: 'admin' | 'runs:write' | 'runs:read'): 진행결과 => ({ code: 403, body: { error: 'FORBIDDEN', need } });

/** 트랜잭션 안에서 그만둘 때 던진다 — 잠그고 가 되돌리고, 바깥에서 결과로 바꾼다 */
class 되돌림 extends Error {
  constructor(readonly 결과: 진행결과) {
    super('결정 진행을 되돌렸다');
  }
}

interface 받은것 {
  key: string;
  pick: string;
  text?: unknown;
  option?: unknown;
  env?: unknown;
  rows?: unknown;
}

function 본문읽기(body: unknown): { prdVersion: number; picks: 받은것[] } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { prdVersion, picks } = body as Record<string, unknown>;
  if (typeof prdVersion !== 'number' || !Number.isSafeInteger(prdVersion) || prdVersion < 0) return null;
  if (!Array.isArray(picks) || picks.length === 0 || picks.length > 2000) return null;
  const 읽음: 받은것[] = [];
  for (const p of picks) {
    if (typeof p !== 'object' || p === null) return null;
    const x = p as Record<string, unknown>;
    if (typeof x.key !== 'string' || typeof x.pick !== 'string') return null;
    읽음.push({ key: x.key, pick: x.pick, text: x.text, option: x.option, env: x.env, rows: x.rows });
  }
  return { prdVersion, picks: 읽음 };
}

/**
 * 버그로 판정돼 목록에 없는 실패 — 「화면이 맞음으로 바꾸기」만 받는다(§3.6 「고를 때 본 것과 다르면」 예외).
 * 이미 화면이 맞음 요청(폐기 안 됨)이 그 실패를 실었으면 안 받는다 — 같은 고침을 두 번 쓰게 된다
 */
async function 버그판정실패(서비스: number, key: string): Promise<결정항목 | null> {
  const m = /^fail:(\d{1,15}):(.+)$/.exec(key);
  if (m === null) return null;
  const { pool } = await import('../db/index.js');
  const r = await pool.query(
    `SELECT 1 FROM run_case_bug b JOIN test_run t ON t.run_id = b.run_id
      WHERE b.run_id = $1 AND b.tc_id = $2 AND t.service_id = $3
        AND NOT EXISTS (SELECT 1 FROM authoring_request q CROSS JOIN LATERAL jsonb_array_elements(${화면목록식('q.params')}) 칸
                         WHERE q.service_id = $3 AND q.discarded_at IS NULL AND q.kind IN ('AUTHOR', 'RERUN')
                           AND 칸->>'runId' = $1::text AND 칸->>'tcId' = $2)`,
    [Number(m[1]), m[2], 서비스],
  );
  if (r.rowCount === 0) return null;
  return { key, group: 2, kind: 'FAIL', picks: ['SCREEN'], blockedBy: null, runId: Number(m[1]), tcId: m[2]!, reqs: [], verify: null, reason: null, finishedAt: null };
}

interface 준비 {
  버그: { key: string; runId: number; tcId: string }[];
  확인: { key: string; 결정: 확인결정 }[];
  반영: { key: string; rootId: number; runId: number }[];
  화면: { key: string; 칸: 화면이맞음 }[];
  요구다시: string | null;
  API: { key: string; 준비: 다시작성준비 } | null;
  보완: { key: string; env: string; startUrl: string | null } | null;
  초안: { key: string; card: 초안카드; rows: number[] }[];
  /** 버리기 · 다시 만들기 — 끝난 초안 버리기는 고른 줄 없이 진행으로 남기고, 실패 · 멈춘 초안 버리기는 폐기로 찍는다 */
  초안끝: { key: string; requestId: number; pick: 'DROP' | 'RETRY'; done: boolean }[];
  /** 고를 때 본 열린 작성 — 잠금 안에서 다시 견준다 */
  열린: number[];
}

/** 고른 것마다 권한 · 열쇠 · 값을 보고 진행 재료를 모은다. 풀 연결로 읽기만 한다 — 잠금을 잡기 전이다 */
async function 준비하기(서비스: number, 누구: 부른이, 본문: { prdVersion: number; picks: 받은것[] }): Promise<준비 | 진행결과> {
  const 재료 = await 결정재료읽기(서비스, 누구, false);
  if (본문.prdVersion !== 재료.목록.prdVersion) return 낡음;
  const 항목들 = new Map(재료.목록.items.map((x) => [x.key, x]));
  const 준: 준비 = { 버그: [], 확인: [], 반영: [], 화면: [], 요구다시: null, API: null, 보완: null, 초안: [], 초안끝: [], 열린: 재료.목록.open };
  const 본열쇠 = new Set<string>();
  for (const p of 본문.picks) {
    if (본열쇠.has(p.key)) return 틀림(p.key);
    본열쇠.add(p.key);
    if (p.key.startsWith('fail:') && !누구.실행읽기) return 권한없음('runs:read');
    const 항목 = 항목들.get(p.key) ?? 재료.실패.get(p.key) ?? (p.pick === 'SCREEN' ? await 버그판정실패(서비스, p.key) : null);
    if (항목 === null || 항목 === undefined) return 낡음;
    if (!(항목.picks as string[]).includes(p.pick)) {
      if (p.pick === 'APPLY' && 항목.blockedBy === 'ADMIN_ONLY') return 권한없음('admin');
      if (p.pick === 'BUG' && 항목.blockedBy === 'NO_RUN_WRITE') return 권한없음('runs:write');
      return 틀림(p.key);
    }
    // ③ 이 반영 대기를 기다리면 ① 을 모두 「올린다」로 골라야 한다 — 그래야 ③ 이 반영 뒤에 센 값으로 돈다
    if (항목.needsApply === true) {
      const 대기 = 재료.목록.items.filter((x) => x.kind === 'APPLY');
      if (!대기.every((x) => 본문.picks.some((q) => q.key === x.key && q.pick === 'APPLY'))) return 틀림(p.key);
    }
    const 결과 = await 하나준비(서비스, 항목, p, 준);
    if (결과 !== null) return 결과;
  }
  return 준;
}

async function 하나준비(서비스: number, 항목: 결정항목, p: 받은것, 준: 준비): Promise<진행결과 | null> {
  switch (항목.kind) {
    case 'APPLY':
      준.반영.push({ key: p.key, rootId: 항목.rootId, runId: 항목.runId });
      return null;
    case 'FAIL': {
      if (p.pick === 'BUG') {
        준.버그.push({ key: p.key, runId: 항목.runId, tcId: 항목.tcId });
        return null;
      }
      const 칸 = await 화면이맞음채우기(서비스, 항목.runId, 항목.tcId);
      if ('error' in 칸) return 틀림(p.key);
      준.화면.push({ key: p.key, 칸 });
      return null;
    }
    case 'CHECK': {
      if (p.pick === 'SAME') 준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: 'SAME' } });
      else if (p.pick === 'PICK') {
        const 고른 = typeof p.option === 'number' && Number.isInteger(p.option) ? 항목.options[p.option] : undefined;
        // 근거 원문은 2000자까지라 요구 문장 상한을 넘을 수 있다 — 자르면 사람이 고른 원문이 아니다
        if (고른 === undefined || 고른.quote.length > 상한.요구문장) return 틀림(p.key);
        준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: 'PICK', text: 고른.quote, asset: 고른.asset } });
      } else {
        const text = 요구문장(p.text);
        if (text === null) return 틀림(p.key);
        준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: p.pick as 'EDIT' | 'OWN', text } });
      }
      return null;
    }
    case 'PRD_CHANGED':
      준.요구다시 = p.key;
      return null;
    case 'API_CHANGED': {
      const 준비 = await 다시작성준비하기({ 서비스, from: 항목.fromVersion, to: 항목.toVersion, env: p.env });
      if ('error' in 준비) return 준비.error === 'BAD_ENV' || 준비.error === 'NOTHING_TO_APPLY' ? 틀림(p.key) : 낡음;
      준.API = { key: p.key, 준비 };
      return null;
    }
    case 'SCREENS': {
      const 이음 = await 최근대조(서비스);
      const env = p.env ?? 항목.env;
      if (p.env !== undefined) {
        const 판정 = await 역방향칸판정({ compare: true, env: p.env }, 서비스);
        if ('error' in 판정) return 틀림(p.key);
      }
      if (typeof env !== 'string') return 틀림(p.key);
      준.보완 = { key: p.key, env, startUrl: 이음?.env === env ? 이음.startUrl : null };
      return null;
    }
    case 'PRD_DRAFT': {
      if (p.pick !== 'TAKE') {
        준.초안끝.push({ key: p.key, requestId: 항목.requestId, pick: p.pick as 'DROP' | 'RETRY', done: 항목.state === 'DONE' });
        return null;
      }
      // 고른 줄 차례 번호 — 겹침 · 범위 밖 · 그 사이 지워진 요구를 고친 줄은 거절한다(사람이 못 고르게 화면이 막는 줄이다)
      const rows = p.rows;
      if (!Array.isArray(rows) || rows.length === 0 || new Set(rows).size !== rows.length) return 틀림(p.key);
      if (!rows.every((i) => Number.isInteger(i) && 항목.rows[i as number]?.gone === false)) return 틀림(p.key);
      준.초안.push({ key: p.key, card: 항목, rows: rows as number[] });
      return null;
    }
    default:
      return 틀림(p.key);
  }
}

/**
 * 반영 하나 — 보류 값을 넣었으면 그 실행의 대상 서버로 3회 돌린다(2026-10-26 시작 질문). 거절은 진행 전체를 되돌린다.
 * 행은 뿌리 잠금 안에서 다시 읽는다 — 고른 뒤 그 사이 폐기 · 보류 입력이 바뀌었으면 옛 모습으로 판정하게 된다
 */
async function 반영세우기(손: PoolClient, 서비스: number, runId: number, 사람: 저장하는사람, key: string): Promise<number> {
  const 행 = await 한건(runId, 손);
  if (행 === null || 행.serviceId !== 서비스) throw new 되돌림(낡음);
  let 판정 = await 머지세우기(손, 행, 서비스, undefined, 사람);
  if ('error' in 판정 && 판정.error === 'BAD_ENV' && !행.compare && 행.env !== null) 판정 = await 머지세우기(손, 행, 서비스, 행.env, 사람);
  if (!('error' in 판정)) return 판정.id;
  // 그 사이 재실행 · 폐기 · 반영이 끼었으면 사람이 본 것과 다르다
  throw new 되돌림(['RUN_ACTIVE', 'NOT_LATEST', 'BAD_SOURCE', 'NOT_MERGEABLE'].includes(판정.error) ? 낡음 : 틀림(key));
}

export async function 결정진행(서비스: number, 누구: 부른이, 사람: 저장하는사람, body: unknown): Promise<진행결과> {
  const 본문 = 본문읽기(body);
  if (본문 === null) return { code: 400, body: { error: 'INVALID_REQUEST' } };
  // BTS 를 이은 프로젝트는 판정을 BTS 에서만 한다 — 실패를 고르는 진행은 목록에 없다고 낡음으로 돌리지 않고 까닭을 밝힌다(도메인/BTS §7)
  if (본문.picks.some((p) => p.key.startsWith('fail:')) && (await BTS이은서비스인가(서비스))) return { code: 400, body: { error: 'BAD_DECISION' } };
  const 준 = await 준비하기(서비스, 누구, 본문);
  if ('code' in 준) return 준;
  const 지금것 = 준.확인.length + 준.초안.length === 0 ? null : await 지금판(서비스);
  const 확인판 = 준.확인.length === 0 ? null : 결정판(지금것?.items ?? [], 준.확인.map((x) => x.결정));
  if (준.확인.length > 0 && 확인판 === null) return 낡음;
  // PRD 초안의 고른 줄은 확인 필요 결정과 한 버전에 담는다 — 두 버전으로 나누면 다시 작성이 앞 버전을 기준으로 잡는다
  let 판: { items: PrdItem[]; changes: 판변경[]; 문장바뀜: boolean; lastNo?: number } | null = 확인판;
  if (준.초안.length > 0) {
    const 적용 = 초안적용(확인판?.items ?? 지금것?.items ?? [], 지금것?.lastNo ?? 0, await 서비스접두사(서비스), 준.초안.map((x) => ({ key: x.key, card: x.card, picked: new Set(x.rows) })), new Date().toISOString());
    if ('error' in 적용) return 틀림(적용.detail);
    판 = { items: 적용.items, changes: [...(확인판?.changes ?? []), ...적용.changes], 문장바뀜: (확인판?.문장바뀜 ?? false) || 적용.바뀜, lastNo: 적용.lastNo };
  }
  const 초안바뀜 = 준.초안.length > 0 && 판 !== null && 판.changes.some((c) => c.issueKeys !== undefined);
  const count = 본문.picks.length;
  try {
    return await 잠그고(서비스, async (손) => {
      // 고를 때 본 버전과 지금 버전이 다르면 아무것도 안 한다 — 두 사람이 같은 버전을 고쳐 한쪽이 조용히 사라지지 않게
      const 지금 = await 손.query<{ v: number }>('SELECT COALESCE(max(version), 0) AS v FROM prd_version WHERE service_id = $1', [서비스]);
      if (지금.rows[0]!.v !== 본문.prdVersion) throw new 되돌림(낡음);
      // 잠금 차례는 기획서 → 뿌리 → 열린 작성이다 — 재실행 · 제출(뿌리 → 열린 작성)과 엇갈려 서로 기다리지 않게
      for (const 뿌리 of [...new Set(준.반영.map((x) => x.rootId))].sort((a, b) => a - b)) {
        await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-root'), ($1::bigint % 2147483647)::int)`, [뿌리]);
      }
      const 열린 = await 열린작성(서비스, 손);
      // 요청을 세우는 진행은 열린 작성이 고를 때와 같아야 한다 — 두 번 누르면 둘째가 첫째가 세운 요청을 못 본 채 같은 요청을 또 세운다
      const 세우나 = 준.반영.length + 준.화면.length + (준.요구다시 === null ? 0 : 1) + (준.API === null ? 0 : 1) + (준.보완 === null ? 0 : 1) > 0 || 판?.문장바뀜 === true;
      if (세우나 && 열린.join() !== 준.열린.join()) throw new 되돌림(낡음);
      const steps: 진행단계[] = [];
      for (const b of 준.버그) {
        if ((await 버그남기기(b.runId, b.tcId, 사람, 손)) === 'NOT_FAILED') throw new 되돌림(틀림(b.key));
        steps.push({ step: 1, key: b.key, requestId: null, version: null });
      }
      const version = 판 !== null && (준.확인.length > 0 || 초안바뀜) ? await 결정판넣기(손, 서비스, 판.items, 사람, 판.changes, 판.lastNo) : null;
      for (const x of [...준.확인, ...준.초안]) steps.push({ step: 2, key: x.key, requestId: null, version });
      for (const x of 준.초안) if (!(await 초안고름남기기(손, x.card.requestId, x.rows, 사람.username, version))) throw new 되돌림(낡음);
      for (const x of 준.반영) steps.push({ step: 3, key: x.key, requestId: await 반영세우기(손, 서비스, x.runId, 사람, x.key), version: null });
      // 뒤 요청은 그때 열린 작성 전부와 이번에 앞서 세운 요청 전부를 기다린다 — 한 번에 하나씩 돈다
      const 앞것 = [...열린];
      const 결정 = () => ({ decision: { after: [...앞것], count } });
      // 문장이 바뀌었거나 화면이 맞음을 골랐으면 바뀐 요구도 같이 다시 만든다 — 기준 판이 하나라 나눠 넣으면 병합 뒤 「반영 안 됨」이 틀어진다
      if (준.요구다시 !== null || 준.화면.length > 0 || 판?.문장바뀜 === true) {
        const 지금시각 = new Date().toISOString();
        const 화면칸 = 준.화면.map((x) => ({ ...x.칸, byName: 사람.displayName, at: 지금시각 }));
        const id = await 줄세우기(
          { 서비스, kind: 'AUTHOR', 기획서: null, 값: { prdApply: true, ...(화면칸.length > 0 ? { screenRight: 화면칸 } : {}), ...결정() }, 누가: 사람.username, 이름: 사람.displayName },
          손,
        );
        앞것.push(id);
        const 열쇠들 = [...(준.요구다시 === null ? [] : [준.요구다시]), ...준.화면.map((x) => x.key), ...(초안바뀜 ? 준.초안.map((x) => x.key) : [])];
        for (const key of 열쇠들.length > 0 ? 열쇠들 : [null]) steps.push({ step: 4, key, requestId: id, version: null });
      }
      if (준.API !== null) {
        const id = await 다시작성넣기(손, 준.API.준비, { 누가: 사람.username, 이름: 사람.displayName }, 결정());
        if (id === null) throw new 되돌림(낡음);
        앞것.push(id);
        steps.push({ step: 4, key: 준.API.key, requestId: id, version: null });
      }
      if (준.보완 !== null) {
        const id = await 줄세우기(
          { 서비스, kind: 'AUTHOR', 기획서: null, 값: 결정(), 누가: 사람.username, 이름: 사람.displayName, 대조: { env: 준.보완.env, startUrl: 준.보완.startUrl } },
          손,
        );
        steps.push({ step: 5, key: 준.보완.key, requestId: id, version: null });
      }
      for (const x of 준.초안끝) {
        if (x.pick === 'RETRY') {
          const id = await 초안다시만들기(손, x.requestId);
          if (id === null) throw new 되돌림(낡음);
          steps.push({ step: 6, key: x.key, requestId: id, version: null });
          continue;
        }
        if (!(x.done ? await 초안고름남기기(손, x.requestId, [], 사람.username, null) : await 초안버리기(손, x.requestId))) throw new 되돌림(낡음);
        steps.push({ step: 6, key: x.key, requestId: null, version: null });
      }
      return { code: 201 as const, body: { steps } };
    });
  } catch (err) {
    if (err instanceof 되돌림) return err.결과;
    throw err;
  }
}
